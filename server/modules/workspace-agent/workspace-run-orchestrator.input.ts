import { composeWorkspaceAnswer } from './workspace-compose'
import { buildBatchAnswer, buildCompletedRunResult } from './workspace-run-completed'
import { executeWorkspaceRunSteps } from './workspace-run-executor'
import { normalizeWorkspaceRunInput } from './workspace-run-normalizer'
import { emitEvent, createRunId, getToolResultError, getToolNameFromAction } from './workspace-run-orchestrator.shared'
import { planWorkspaceRun } from './workspace-run-planner'
import { buildWorkspaceRunPreview } from './workspace-run-preview'
import { reviewWorkspaceRunPlan } from './workspace-run-review'
import { isWorkspaceRunModelError } from './workspace-run-runtime'
import { normalizeTodoDraftTaskTimes } from './workspace-run-time-normalization'
import { understandWorkspaceRunInput } from './workspace-run-understanding'

import type { WorkspaceToolContext, WorkspaceToolResult, WorkspaceIntent, WorkspaceTarget } from './types'
import type {
  OrchestrateWorkspaceRunOptions,
  WorkspaceRunOrchestratorResult,
} from './workspace-run-orchestrator'
import type { PhaseContext } from './workspace-run-orchestrator.shared'
import type { WorkspaceRunPlannerResult, WorkspaceRunPlanHint } from './workspace-run-planner'
import type { WorkspaceInteraction, DraftWorkspaceTask } from '@/shared/workspace/workspace-run-protocol'

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
    signal: ctx.signal,
  })
  emitEvent(ctx, { type: 'phase_completed', phase: 'understand', output: understanding })
  return understanding
}

async function runResolveTodoTimes(
  ctx: PhaseContext,
  draftTasks: DraftWorkspaceTask[],
  fallbackTimeHints: string[],
  referenceTime: string
) {
  return normalizeTodoDraftTaskTimes(draftTasks, {
    fallbackTimeHints,
    referenceTime,
    signal: ctx.signal,
  })
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
        signal: ctx.signal,
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
  updatedAt: string,
  referenceTime: string
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
    referenceTime,
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

async function runBatchCompose(
  ctx: PhaseContext,
  input: {
    preview: Awaited<ReturnType<typeof runPreview>>
    executeResult: Awaited<ReturnType<typeof runExecute>>
  }
) {
  emitEvent(ctx, { type: 'phase_started', phase: 'compose' })

  const result = {
    answer: buildBatchAnswer({
      plan: input.preview.plan,
      executeResult: input.executeResult,
    }),
    usedFallback: true,
  }

  emitEvent(ctx, { type: 'phase_completed', phase: 'compose', output: result })
  return result
}

export async function handleNewInput(
  options: OrchestrateWorkspaceRunOptions
): Promise<WorkspaceRunOrchestratorResult> {
  const { userId, request, store, runModel, searchCandidates, onEvent } = options

  if (request.kind !== 'input') {
    return { ok: false, phase: 'invalid_request', message: 'Expected input request' }
  }

  const runId = createRunId()
  const updatedAt = new Date().toISOString()

  const ctx: PhaseContext = { runId, userId, onEvent, signal: options.signal }

  try {
    const normalized = await runNormalize(ctx, request.text)
    const understanding = await runUnderstand(ctx, normalized, runModel)
    const normalizedDraftTasks = await runResolveTodoTimes(
      ctx,
      understanding.draftTasks,
      normalized.timeHints,
      updatedAt
    )
    const normalizedUnderstanding = {
      ...understanding,
      draftTasks: normalizedDraftTasks,
    }

    const draftTasks = normalizedUnderstanding.draftTasks as Parameters<typeof reviewWorkspaceRunPlan>[0]['draftTasks']

    const plannerResult = await runPlan(ctx, normalizedUnderstanding.draftTasks, searchCandidates, runModel)

    const reviewResult = await runReview(
      ctx,
      draftTasks,
      plannerResult,
      normalizedUnderstanding,
      updatedAt,
      updatedAt
    )

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
      const preview = await runPreview(ctx, normalizedUnderstanding, plannerResult)
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
        const composeResult = executeResult.stepResults.length > 1
          ? await runBatchCompose(ctx, { preview, executeResult })
          : await runCompose(
              ctx,
              {
                intent: normalizedUnderstanding.draftTasks[0].intent as WorkspaceIntent,
                target: normalizedUnderstanding.draftTasks[0].target as Exclude<WorkspaceTarget, 'mixed'>,
              },
              {
                intent: normalizedUnderstanding.draftTasks[0].intent as WorkspaceIntent,
                target: normalizedUnderstanding.draftTasks[0].target as WorkspaceTarget,
                toolName: plannerResult.steps[0]
                  ? getToolNameFromAction(plannerResult.steps[0].action)
                  : 'create_todo',
                toolInput: {},
                needsCompose: true,
              },
              firstOkResult
            )

        await store.updateRunStatus(runId, userId, 'completed')

        emitEvent(ctx, {
          type: 'run_completed',
          result: buildCompletedRunResult({
            executeResult,
            answer: composeResult.answer,
            preview,
            data: executeResult.stepResults.length > 1 ? null : firstOkResult,
          }),
        })

        return {
          ok: true,
          phase: 'completed',
          result: buildCompletedRunResult({
            executeResult,
            answer: composeResult.answer,
            preview,
            data: executeResult.stepResults.length > 1 ? null : firstOkResult,
          }),
        }
      }

      return {
        ok: false,
        phase: 'execute',
        message: 'No successful step results',
      }
    }

    if (reviewResult.status === 'await_user') {
      await store.failAwaitingRuns(userId)
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
    const errorCode = isWorkspaceRunModelError(error) ? error.code : 'INTERNAL_ERROR'
    const retryable = isWorkspaceRunModelError(error) ? error.retryable : false

    emitEvent(ctx, {
      type: 'run_failed',
      error: {
        code: errorCode,
        message: error instanceof Error ? error.message : 'Internal error',
        retryable,
      },
    })

    return {
      ok: false,
      phase: 'error',
      message: error instanceof Error ? error.message : 'Internal error',
    }
  }
}
