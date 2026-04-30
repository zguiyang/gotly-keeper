import { composeWorkspaceAnswer } from './workspace-compose'
import { buildBatchAnswer, buildCompletedRunResult } from './workspace-run-completed'
import { executeWorkspaceRunSteps } from './workspace-run-executor'
import {
  emitEvent,
  getToolResultError,
  getToolNameFromAction,
} from './workspace-run-orchestrator.shared'
import { planWorkspaceRun, type WorkspaceRunPlannerResult } from './workspace-run-planner'
import {
  reviewWorkspaceRunPlan,
  type ReviewableDraftTask,
  type ReviewablePlan,
  type WorkspaceReviewPendingRunSnapshot,
} from './workspace-run-review'
import { normalizeTodoDraftTaskTimes } from './workspace-run-time-normalization'

import type { WorkspaceToolContext, WorkspaceToolResult, WorkspaceIntent, WorkspaceTarget } from './types'
import type { OrchestrateWorkspaceRunOptions } from './workspace-run-orchestrator'
import type { PhaseContext } from './workspace-run-orchestrator.shared'
import type {
  DraftWorkspaceTask,
  WorkspaceInteraction,
  WorkspaceInteractionResponse,
  WorkspacePlanPreview,
  WorkspaceRunRequest,
  WorkspaceRunResult,
} from '@/shared/workspace/workspace-run-protocol'

type ResumeResponse = Extract<WorkspaceRunRequest, { kind: 'resume' }>['response']

async function runExecute(
  ctx: PhaseContext,
  steps: WorkspaceRunPlannerResult['steps'],
  userId: string
) {
  emitEvent(ctx, { type: 'phase_started', phase: 'execute' })

  const toolContext: WorkspaceToolContext = { userId }
  const result = await executeWorkspaceRunSteps(steps, toolContext, {
    onToolCallStarted: (event) => {
      emitEvent(ctx, {
        type: 'tool_call_started',
        toolName: event.toolName,
        preview: event.preview,
      })
    },
    onToolCallCompleted: (event) => {
      emitEvent(ctx, {
        type: 'tool_call_completed',
        toolName: event.toolName,
        result: event.result,
      })
    },
  })

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
function toDraftWorkspaceTasks(
  snapshot: WorkspaceReviewPendingRunSnapshot,
  response: ResumeResponse
): DraftWorkspaceTask[] | null {
  if (response.type === 'edit_draft_tasks' && response.action === 'save') {
    return response.tasks
  }

  if (
    snapshot.interaction.type === 'edit_draft_tasks' &&
    Array.isArray(snapshot.interaction.tasks)
  ) {
    return snapshot.interaction.tasks.map((task) => ({
      id: task.id,
      intent: task.intent,
      target: task.target === 'external' ? 'mixed' : task.target,
      title: task.title ?? '',
      confidence: task.confidence,
      ambiguities: task.ambiguities,
      corrections: task.corrections,
      slots: Object.fromEntries(
        Object.entries(task.slots).filter(([, value]) => typeof value === 'string')
      ) as Record<string, string>,
    }))
  }

  if (!snapshot.understandingPreview) {
    return null
  }

  return snapshot.understandingPreview.draftTasks
}

function mergeClarification(
  tasks: DraftWorkspaceTask[],
  response: Extract<WorkspaceInteractionResponse, { type: 'clarify_slots'; action: 'submit' }>
) {
  return tasks.map((task, index) => {
    if (index !== 0) {
      return task
    }

    const nextTitle = response.values.title?.trim()

    return {
      ...task,
      title: nextTitle && nextTitle.length > 0 ? nextTitle : task.title,
      slots: {
        ...task.slots,
        ...response.values,
      },
    }
  })
}

function toReviewableDraftTasks(tasks: DraftWorkspaceTask[]): ReviewableDraftTask[] {
  return tasks.map((task) => ({
    id: task.id,
    intent: task.intent as ReviewableDraftTask['intent'],
    target: task.target,
    title: task.title,
    confidence: task.confidence,
    ambiguities: task.ambiguities,
    corrections: task.corrections,
    slots: task.slots,
  }))
}

function toReviewablePlan(result: WorkspaceRunPlannerResult): ReviewablePlan {
  return {
    summary: result.summary,
    steps: result.steps.map((step) => ({
      id: step.id,
      action: step.action,
      target: step.target,
      title: step.title,
      risk: step.risk,
      requiresUserApproval: step.requiresUserApproval,
      candidates: step.candidates,
    })),
  }
}

async function replanDraftTasks(
  tasks: DraftWorkspaceTask[],
  options: OrchestrateWorkspaceRunOptions,
  referenceTime: string
) {
  return planWorkspaceRun({
    userId: options.userId,
    draftTasks: await normalizeTodoDraftTaskTimes(tasks, {
      referenceTime,
      signal: options.signal,
    }),
    searchCandidates: options.searchCandidates,
    runPlanHints: async () => null,
  })
}

function applySelectedCandidate(
  plannerResult: WorkspaceRunPlannerResult,
  candidateId: string
): WorkspaceRunPlannerResult {
  return {
    ...plannerResult,
    steps: plannerResult.steps.map((step) => {
      if (step.action !== 'update_todo') {
        return step
      }

      return {
        ...step,
        candidates: [
          {
            id: candidateId,
            type: 'todo',
            title: step.title ?? '',
            confidence: 1,
            matchReason: '用户已选择候选项',
          },
        ],
        toolInput: {
          ...(step.toolInput ?? {}),
          selector: {
            ...(((step.toolInput?.selector as Record<string, unknown> | undefined) ?? {})),
            id: candidateId,
          },
        },
      }
    }),
  }
}

function applyEditedPlan(
  plannerResult: WorkspaceRunPlannerResult,
  editedPlan: WorkspacePlanPreview
): WorkspaceRunPlannerResult {
  const stepMap = new Map(plannerResult.steps.map((step) => [step.id, step]))
  const steps: WorkspaceRunPlannerResult['steps'] = []

  for (const previewStep of editedPlan.steps) {
    const original = stepMap.get(previewStep.id)
    if (!original) {
      continue
    }

    steps.push({
      ...original,
      title: previewStep.title,
    })
  }

  return {
    summary: editedPlan.summary,
    steps,
  }
}

async function runBatchCompose(
  ctx: PhaseContext,
  input: {
    preview: WorkspaceRunResult['preview']
    executeResult: Awaited<ReturnType<typeof runExecute>>
  }
) {
  emitEvent(ctx, { type: 'phase_started', phase: 'compose' })

  const result = {
    answer: buildBatchAnswer({
      plan: input.preview?.plan,
      executeResult: input.executeResult,
    }),
    usedFallback: true,
  }

  emitEvent(ctx, { type: 'phase_completed', phase: 'compose', output: result })
  return result
}

async function executePlannedRun(input: {
  ctx: PhaseContext
  userId: string
  store: OrchestrateWorkspaceRunOptions['store']
  runId: string
  snapshot: WorkspaceReviewPendingRunSnapshot
  plannerResult: WorkspaceRunPlannerResult
  draftTasks: DraftWorkspaceTask[]
}) {
  const executeResult = await runExecute(input.ctx, input.plannerResult.steps, input.userId)
  const failedStep = executeResult.stepResults.find((step) => !step.result.ok)

  if (failedStep) {
    const errorInfo = getToolResultError(failedStep.result)
    await input.store.updateRunStatus(input.runId, input.userId, 'failed')
    emitEvent(input.ctx, {
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
    } as const
  }

  const firstOkStep = executeResult.stepResults.find((step) => step.result.ok)
  const firstOkResult = firstOkStep?.result

  if (!firstOkStep || !firstOkResult || !firstOkResult.ok) {
    return {
      ok: false,
      phase: 'execute',
      message: 'No successful step results',
    } as const
  }

  const firstTask = input.draftTasks[0]
  const toolName = firstOkStep.toolName
  const preview = input.snapshot.preview
    ? {
        understanding: input.snapshot.understandingPreview ?? undefined,
        plan: input.snapshot.preview.plan ?? undefined,
      }
    : undefined
  const composeResult = executeResult.stepResults.length > 1
    ? await runBatchCompose(input.ctx, { preview, executeResult })
    : await runCompose(
        input.ctx,
        {
          intent: firstTask.intent as WorkspaceIntent,
          target: firstTask.target as Exclude<WorkspaceTarget, 'mixed'>,
        },
        {
          intent: firstTask.intent as WorkspaceIntent,
          target: firstTask.target as WorkspaceTarget,
          toolName,
          toolInput:
            input.plannerResult.steps.find((step) => getToolNameFromAction(step.action) === toolName)
              ?.toolInput ?? {},
          needsCompose: true,
        },
        firstOkResult
      )

  await input.store.updateRunStatus(input.runId, input.userId, 'completed')

  emitEvent(input.ctx, {
    type: 'run_completed',
    result: buildCompletedRunResult({
      executeResult,
      preview,
      answer: composeResult.answer,
      data: executeResult.stepResults.length > 1 ? null : firstOkResult,
    }),
  })

  return {
    ok: true,
    phase: 'completed',
    result: {
      summary: executeResult.summary,
      answer: composeResult.answer,
      preview: input.snapshot.preview,
    },
  } as const
}

async function failRun(
  ctx: PhaseContext,
  store: OrchestrateWorkspaceRunOptions['store'],
  runId: string,
  userId: string,
  code: string,
  message: string
) {
  const clearedCount = await store.failAwaitingRuns(userId)

  if (clearedCount === 0) {
    await store.updateRunStatus(runId, userId, 'failed')
  }

  emitEvent(ctx, {
    type: 'run_failed',
    error: {
      code,
      message,
      retryable: false,
    },
  })

  return {
    ok: false,
    phase: 'cancelled',
    message,
  } as const
}

export async function handleResume(
  options: OrchestrateWorkspaceRunOptions
): Promise<{
  ok: boolean
  phase?: string
  message?: string
  result?: unknown
  snapshot?: unknown
}> {
  const { userId, request, store, onEvent } = options

  if (request.kind !== 'resume') {
    return { ok: false, phase: 'invalid_request', message: 'Expected resume request' }
  }

  const snapshot = await store.loadLatestAwaiting(userId)
  if (!snapshot) {
    return {
      ok: false,
      phase: 'not_found',
      message: 'No pending run found',
    }
  }

  if (snapshot.runId !== request.runId) {
    return {
      ok: false,
      phase: 'mismatch',
      message: 'Run ID mismatch',
    }
  }

  if (snapshot.interactionId !== request.interactionId) {
    return {
      ok: false,
      phase: 'mismatch',
      message: 'Interaction ID mismatch',
    }
  }

  if (snapshot.interaction.type !== request.response.type) {
    return {
      ok: false,
      phase: 'mismatch',
      message: 'Interaction type mismatch',
    }
  }

  const ctx: PhaseContext = {
    runId: request.runId,
    userId,
    onEvent,
    signal: options.signal,
  }

  if (request.response.action === 'cancel') {
    return failRun(ctx, store, request.runId, userId, 'CANCELLED', 'User cancelled')
  }

  if (request.response.type === 'select_candidate' && request.response.action === 'skip') {
    return failRun(ctx, store, request.runId, userId, 'SKIPPED', 'User skipped candidate selection')
  }

  const baseDraftTasks = toDraftWorkspaceTasks(snapshot, request.response)
  if (!baseDraftTasks || baseDraftTasks.length === 0) {
    return {
      ok: false,
      phase: 'invalid_state',
      message: 'No draft tasks available to resume',
    }
  }

  let draftTasks = baseDraftTasks

  if (request.response.type === 'clarify_slots' && request.response.action === 'submit') {
    draftTasks = mergeClarification(draftTasks, request.response)
  }

  const referenceTime = snapshot.referenceTime ?? snapshot.updatedAt

  let plannerResult = await replanDraftTasks(draftTasks, options, referenceTime)

  if (request.response.type === 'select_candidate' && request.response.action === 'select') {
    plannerResult = applySelectedCandidate(plannerResult, request.response.candidateId)
  }

  if (request.response.type === 'confirm_plan' && request.response.action === 'edit') {
    plannerResult = applyEditedPlan(plannerResult, request.response.editedPlan)
  }

  if (
    request.response.type === 'confirm_plan' ||
    request.response.type === 'select_candidate'
  ) {
    return executePlannedRun({
      ctx,
      userId,
      store,
      runId: request.runId,
      snapshot,
      plannerResult,
      draftTasks,
    })
  }

  const reviewDecision = reviewWorkspaceRunPlan({
    runId: request.runId,
    draftTasks: toReviewableDraftTasks(draftTasks),
    plan: toReviewablePlan(plannerResult),
    understandingPreview: {
      rawInput: snapshot.understandingPreview?.rawInput ?? '',
      normalizedInput: snapshot.understandingPreview?.normalizedInput ?? '',
      draftTasks,
      corrections: snapshot.understandingPreview?.corrections ?? [],
    },
    updatedAt: new Date().toISOString(),
    referenceTime,
    draftTasksConfirmed:
      request.response.type === 'edit_draft_tasks' && request.response.action === 'save',
  })

  emitEvent(ctx, { type: 'phase_started', phase: 'review' })
  emitEvent(ctx, { type: 'phase_completed', phase: 'review', output: reviewDecision })

  if (reviewDecision.status === 'reject') {
    await store.updateRunStatus(request.runId, userId, 'failed')
    emitEvent(ctx, {
      type: 'run_failed',
      error: {
        code: 'REJECTED',
        message: `Run rejected: ${reviewDecision.reason}`,
        retryable: false,
      },
    })

    return {
      ok: false,
      phase: 'review',
      message: `Run rejected: ${reviewDecision.reason}`,
    }
  }

  if (reviewDecision.status === 'await_user') {
    await store.failAwaitingRuns(userId, { excludeRunId: request.runId })
    await store.saveSnapshot(reviewDecision.snapshot, userId)
    emitEvent(ctx, {
      type: 'awaiting_user',
      interaction: reviewDecision.snapshot.interaction as unknown as WorkspaceInteraction,
    })

    return {
      ok: true,
      phase: 'review',
      snapshot: reviewDecision.snapshot,
    }
  }

  return executePlannedRun({
    ctx,
    userId,
    store,
    runId: request.runId,
    snapshot,
    plannerResult,
    draftTasks,
  })
}
