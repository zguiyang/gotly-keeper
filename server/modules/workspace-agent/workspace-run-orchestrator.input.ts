import type { OrchestrateWorkspaceRunOptions } from './workspace-run-orchestrator'
import { PhaseContext, emitEvent, createRunId, getToolResultError, getToolNameFromAction } from './workspace-run-orchestrator.shared'

import { normalizeWorkspaceRunInput } from './workspace-run-normalizer'
import { understandWorkspaceRunInput } from './workspace-run-understanding'
import { planWorkspaceRun } from './workspace-run-planner'
import { reviewWorkspaceRunPlan } from './workspace-run-review'
import { buildWorkspaceRunPreview } from './workspace-run-preview'
import { executeWorkspaceRunSteps } from './workspace-run-executor'
import { composeWorkspaceAnswer } from './workspace-compose'

import type { WorkspaceRunPlannerResult } from './workspace-run-planner'
import type { WorkspaceToolContext, WorkspaceToolResult, WorkspaceIntent, WorkspaceTarget } from './types'
import type { WorkspaceInteraction } from '@/shared/workspace/workspace-run-protocol'
import type { DraftWorkspaceTask } from '@/shared/workspace/workspace-run-protocol'
import type { WorkspaceRunPlanHint } from './workspace-run-planner'

async function runNormalize(ctx: PhaseContext, rawText: string) {
  emitEvent(ctx, { type: 'phase_started', phase: 'normalize' })
  const normalized = normalizeWorkspaceRunInput(rawText)
  emitEvent(ctx, { type: 'phase_completed', phase: 'normalize', output: normalized })
  return normalized
}

async function runUnderstand(
  ctx: PhaseContext,
  normalized: ReturnType<typeof normalizeWorkspaceRunInput>,
  runModel: OrchestrateWorkspaceRunOptions['runModel']
) {
  emitEvent(ctx, { type: 'phase_started', phase: 'understand' })
  const understanding = await understandWorkspaceRunInput({
    normalized,
    runModel,
  })
  emitEvent(ctx, { type: 'phase_completed', phase: 'understand', output: understanding })
  return understanding
}

async function runPlan(
  ctx: PhaseContext,
  draftTasks: DraftWorkspaceTask[],
  searchCandidates: OrchestrateWorkspaceRunOptions['searchCandidates'],
  runModel: OrchestrateWorkspaceRunOptions['runModel']
): Promise<WorkspaceRunPlannerResult> {
  emitEvent(ctx, { type: 'phase_started', phase: 'plan' })

  const runPlanHints: (input: { draftTask: DraftWorkspaceTask; userPrompt: string }) => Promise<WorkspaceRunPlanHint | null | undefined> = async ({ draftTask }) => {
    try {
      const result = await runModel({
        systemPrompt: '',
        userPrompt: JSON.stringify(draftTask),
      })
      return result as WorkspaceRunPlanHint | null
    } catch {
      return null
    }
  }

  const result = await planWorkspaceRun({
    userId: ctx.userId,
    draftTasks,
    searchCandidates,
    runPlanHints,
  })

  emitEvent(ctx, { type: 'phase_completed', phase: 'plan', output: result })
  return result
}

async function runReview(
  ctx: PhaseContext,
  draftTasks: Parameters<typeof reviewWorkspaceRunPlan>[0]['draftTasks'],
  plan: WorkspaceRunPlannerResult,
  understandingPreview: Parameters<typeof reviewWorkspaceRunPlan>[0]['understandingPreview'],
  updatedAt: string
) {
  emitEvent(ctx, { type: 'phase_started', phase: 'review' })

  const reviewResult = reviewWorkspaceRunPlan({
    runId: ctx.runId,
    draftTasks,
    plan: {
      summary: plan.summary,
      steps: plan.steps.map((step) => ({
        id: step.id,
        action: step.action as 'create_note' | 'create_todo' | 'create_bookmark' | 'query_assets' | 'summarize_assets' | 'update_todo',
        target: step.target as 'notes' | 'todos' | 'bookmarks' | 'mixed',
        title: step.title,
        risk: step.risk as 'low' | 'medium' | 'high',
        requiresUserApproval: step.requiresUserApproval,
        candidates: step.candidates,
      })),
    },
    understandingPreview,
    updatedAt,
  })

  emitEvent(ctx, { type: 'phase_completed', phase: 'review', output: reviewResult })
  return reviewResult
}

async function runPreview(
  ctx: PhaseContext,
  understandingPreview: Parameters<typeof buildWorkspaceRunPreview>[0]['understandingPreview'],
  plannerResult: WorkspaceRunPlannerResult
) {
  emitEvent(ctx, { type: 'phase_started', phase: 'preview' })

  const preview = buildWorkspaceRunPreview({
    runId: ctx.runId,
    understandingPreview,
    plannerResult,
  })

  emitEvent(ctx, { type: 'phase_completed', phase: 'preview', output: preview })
  return preview
}

async function runExecute(
  ctx: PhaseContext,
  steps: WorkspaceRunPlannerResult['steps'],
  userId: string
) {
  emitEvent(ctx, { type: 'phase_started', phase: 'execute' })

  const toolContext: WorkspaceToolContext = { userId }

  const executeEvents = {
    onToolCallStarted: (event: { toolName: string; preview: string }) => {
      emitEvent(ctx, { type: 'tool_call_started', toolName: event.toolName, preview: event.preview })
    },
    onToolCallCompleted: (event: { toolName: string; result: WorkspaceToolResult }) => {
      emitEvent(ctx, { type: 'tool_call_completed', toolName: event.toolName, result: event.result })
    },
  }

  const result = await executeWorkspaceRunSteps(steps, toolContext, executeEvents)

  emitEvent(ctx, { type: 'phase_completed', phase: 'execute', output: result })
  return result
}

async function runCompose(
  ctx: PhaseContext,
  task: Parameters<typeof composeWorkspaceAnswer>[0]['task'],
  plan: Parameters<typeof composeWorkspaceAnswer>[0]['plan'],
  data: Parameters<typeof composeWorkspaceAnswer>[0]['data']
) {
  emitEvent(ctx, { type: 'phase_started', phase: 'compose' })

  const result = await composeWorkspaceAnswer({
    task,
    plan,
    data,
  })

  emitEvent(ctx, { type: 'phase_completed', phase: 'compose', output: result })
  return result
}

export async function handleNewInput(
  options: OrchestrateWorkspaceRunOptions
): Promise<{
  ok: boolean
  phase?: string
  message?: string
  result?: unknown
  snapshot?: unknown
}> {
  const { userId, request, store, runModel, searchCandidates, onEvent } = options

  if (request.kind !== 'input') {
    return { ok: false, phase: 'invalid_request', message: 'Expected input request' }
  }

  const runId = createRunId()
  const updatedAt = new Date().toISOString()

  const ctx: PhaseContext = { runId, userId, onEvent }

  try {
    const normalized = await runNormalize(ctx, request.text)
    const understanding = await runUnderstand(ctx, normalized, runModel)

    const draftTasks = understanding.draftTasks as Parameters<typeof reviewWorkspaceRunPlan>[0]['draftTasks']

    const plannerResult = await runPlan(ctx, understanding.draftTasks, searchCandidates, runModel)

    const reviewResult = await runReview(ctx, draftTasks, plannerResult, understanding, updatedAt)

    if (reviewResult.status === 'reject') {
      emitEvent(ctx, {
        type: 'run_failed',
        error: {
          code: 'REJECTED',
          message: `Run rejected: ${reviewResult.reason}`,
          retryable: false,
        },
      })

      return {
        ok: false,
        phase: 'review',
        message: `Run rejected: ${reviewResult.reason}`,
      }
    }

    if (reviewResult.status === 'auto_execute') {
      const preview = await runPreview(ctx, understanding, plannerResult)
      const executeResult = await runExecute(ctx, plannerResult.steps, userId)

      const failedStep = executeResult.stepResults.find((r) => !r.result.ok)
      if (failedStep) {
        const errorInfo = getToolResultError(failedStep.result)
        await store.updateRunStatus(runId, userId, 'failed')

        emitEvent(ctx, {
          type: 'run_failed',
          error: {
            code: errorInfo?.code ?? 'EXECUTION_ERROR',
            message: errorInfo?.message ?? 'Step execution failed',
            retryable: true,
          },
        })

        return {
          ok: false,
          phase: 'execute',
          message: errorInfo?.message ?? 'Step execution failed',
        }
      }

      const firstOkResult = executeResult.stepResults.find((r) => r.result.ok)?.result

      if (firstOkResult && firstOkResult.ok) {
        const firstTask = understanding.draftTasks[0]
        const firstStep = plannerResult.steps[0]
        const toolName = firstStep ? getToolNameFromAction(firstStep.action) : 'create_todo'

        const composeResult = await runCompose(
          ctx,
          { intent: firstTask.intent as WorkspaceIntent, target: firstTask.target as Exclude<WorkspaceTarget, 'mixed'> },
          { intent: firstTask.intent as WorkspaceIntent, target: firstTask.target as WorkspaceTarget, toolName, toolInput: {}, needsCompose: true },
          firstOkResult
        )

        await store.updateRunStatus(runId, userId, 'completed')

        emitEvent(ctx, {
          type: 'run_completed',
          result: {
            summary: executeResult.summary,
            preview: { plan: preview.plan },
            data: firstOkResult,
          },
        })

        return {
          ok: true,
          phase: 'completed',
          result: {
            summary: executeResult.summary,
            answer: composeResult.answer,
            preview,
          },
        }
      }

      return {
        ok: false,
        phase: 'execute',
        message: 'No successful step results',
      }
    }

    if (reviewResult.status === 'await_user') {
      await store.updateRunStatus(runId, userId, 'awaiting_user')
      await store.saveSnapshot(reviewResult.snapshot, userId)

      emitEvent(ctx, {
        type: 'awaiting_user',
        interaction: reviewResult.snapshot.interaction as WorkspaceInteraction,
      })

      return {
        ok: true,
        phase: 'review',
        snapshot: reviewResult.snapshot,
      }
    }

    return {
      ok: false,
      phase: 'review',
      message: 'Unknown review decision',
    }
  } catch (error) {
    emitEvent(ctx, {
      type: 'run_failed',
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Internal error',
        retryable: false,
      },
    })

    return {
      ok: false,
      phase: 'error',
      message: error instanceof Error ? error.message : 'Internal error',
    }
  }
}
