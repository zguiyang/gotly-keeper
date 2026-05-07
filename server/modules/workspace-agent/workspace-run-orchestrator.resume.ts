import { composeWorkspaceAnswer } from './workspace-compose'
import { buildBatchAnswer, buildCompletedRunResult } from './workspace-run-completed'
import { executeWorkspaceRunSteps } from './workspace-run-executor'
import {
  emitEvent,
  getToolResultError,
  getToolNameFromAction,
  recordPhaseTiming,
} from './workspace-run-orchestrator.shared'
import { planWorkspaceRun, type WorkspaceRunPlannerResult } from './workspace-run-planner'
import { buildWorkspaceRunPreview } from './workspace-run-preview'
import {
  reviewWorkspaceRunPlan,
  type ReviewableDraftTask,
  type ReviewablePlan,
  type WorkspaceReviewPendingRunSnapshot,
} from './workspace-run-review'
import { normalizeTodoDraftTaskTimes } from './workspace-run-time-normalization'

import type { WorkspaceToolContext, WorkspaceIntent, WorkspaceTarget } from './types'
import type {
  OrchestrateWorkspaceRunOptions,
  WorkspaceRunOrchestratorResult,
} from './workspace-run-orchestrator'
import type { PhaseContext } from './workspace-run-orchestrator.shared'
import type {
  ClarifySlotsInteraction,
  DraftWorkspaceTask,
  WorkspaceInteractionResponse,
  WorkspaceRunRequest,
  WorkspaceRunResult,
} from '@/shared/workspace/workspace-run-protocol'

type ResumeResponse = Extract<WorkspaceRunRequest, { kind: 'resume' }>['response']

function parseClarifiedTarget(value: string | undefined): WorkspaceTarget | null {
  const normalized = value?.trim()
  if (normalized === 'todos' || normalized === 'notes' || normalized === 'bookmarks') {
    return normalized
  }

  return null
}

function isLikelyUrl(value: string | undefined) {
  if (!value) return false
  return /^https?:\/\//i.test(value.trim())
}

function needsTodoTimeNormalization(task: DraftWorkspaceTask) {
  if (task.target !== 'todos') {
    return false
  }

  const timeText = typeof task.slots.timeText === 'string' ? task.slots.timeText.trim() : ''
  const dueAt = typeof task.slots.dueAt === 'string' ? task.slots.dueAt.trim() : ''
  const timeResolutionKind =
    typeof task.slots.timeResolutionKind === 'string' ? task.slots.timeResolutionKind.trim() : ''

  if (
    typeof task.slots.time === 'string' ||
    typeof task.slots.due === 'string' ||
    typeof task.slots.dueTime === 'string' ||
    typeof task.slots.dueText === 'string' ||
    typeof task.slots.dueDate === 'string'
  ) {
    return true
  }

  if (!timeText) {
    return false
  }

  return dueAt.length === 0 && timeResolutionKind.length === 0
}

async function runExecute(
  ctx: PhaseContext,
  steps: WorkspaceRunPlannerResult['steps'],
  userId: string
) {
  const startTs = Date.now()
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
  recordPhaseTiming(ctx.phaseTimings, 'execute', startTs, Date.now(), 'tool')
  return result
}

async function runCompose(
  ctx: PhaseContext,
  task: Parameters<typeof composeWorkspaceAnswer>[0]['task'],
  plan: Parameters<typeof composeWorkspaceAnswer>[0]['plan'],
  data: Parameters<typeof composeWorkspaceAnswer>[0]['data']
) {
  const startTs = Date.now()
  emitEvent(ctx, { type: 'phase_started', phase: 'compose' })

  const result = await composeWorkspaceAnswer({
    task,
    plan,
    data,
  })

  emitEvent(ctx, { type: 'phase_completed', phase: 'compose', output: result })
  recordPhaseTiming(ctx.phaseTimings, 'compose', startTs, Date.now(), 'model')
  return result
}
function toDraftWorkspaceTasks(
  snapshot: WorkspaceReviewPendingRunSnapshot,
  _response: ResumeResponse
): DraftWorkspaceTask[] | null {
  void _response

  if (!snapshot.understandingPreview) {
    return null
  }

  return snapshot.understandingPreview.draftTasks
}

function mergeClarification(
  tasks: DraftWorkspaceTask[],
  response: Extract<WorkspaceInteractionResponse, { type: 'clarify_slots'; action: 'submit' }>,
  fields: ClarifySlotsInteraction['fields']
) {
  const resolvedClarification = fields.every((field) => {
    if (!field.required) {
      return true
    }

    const value = response.values[field.key]
    return typeof value === 'string' && value.trim().length > 0
  })

  return tasks.map((task, index) => {
    if (index !== 0) {
      return task
    }

    const mergedSlots = { ...task.slots, ...response.values }
    const nextTitle = response.values.title?.trim()
    const nextUrl = response.values.url?.trim()
    const details = response.values.details?.trim()
    const clarifiedQuery = response.values.query?.trim()
    const clarifiedTarget = task.target === 'mixed'
      ? parseClarifiedTarget(response.values.target) ?? task.target
      : task.target
    const resolvedReadClarification =
      (task.intent === 'query' || task.intent === 'summarize') &&
      typeof clarifiedQuery === 'string' &&
      clarifiedQuery.length > 0

    let resolvedTitle = task.title

    if (nextTitle && nextTitle.length > 0) {
      resolvedTitle = nextTitle
    } else if (resolvedReadClarification) {
      resolvedTitle = clarifiedQuery
    } else if (
      task.target === 'mixed' &&
      (clarifiedTarget === 'todos' || clarifiedTarget === 'notes') &&
      details &&
      details.length > 0
    ) {
      resolvedTitle = details
    } else if (clarifiedTarget === 'todos' && (!resolvedTitle || resolvedTitle.length === 0) && details && details.length > 0) {
      resolvedTitle = details
    } else if (clarifiedTarget === 'bookmarks' && (!resolvedTitle || resolvedTitle.length === 0) && nextUrl && nextUrl.length > 0) {
      resolvedTitle = nextUrl
    } else if (clarifiedTarget === 'notes' && (!resolvedTitle || resolvedTitle.length === 0) && details && details.length > 0) {
      resolvedTitle = details
      mergedSlots.content = details
    }

    if (clarifiedTarget === 'notes' && details && details.length > 0) {
      mergedSlots.content = details
    }

    if (clarifiedTarget === 'bookmarks' && details && isLikelyUrl(details) && !nextUrl) {
      mergedSlots.url = details
      if (!resolvedTitle || resolvedTitle.length === 0) {
        resolvedTitle = details
      }
    }

    const ambiguities = resolvedClarification ? [] : task.ambiguities

    return {
      ...task,
      target: clarifiedTarget,
      title: resolvedTitle,
      confidence: clarifiedTarget !== 'mixed' ? Math.max(task.confidence, 0.8) : task.confidence,
      ambiguities,
      clarifyReason:
        resolvedClarification || resolvedReadClarification ? 'none' : task.clarifyReason,
      slots: mergedSlots,
    }
  })
}

function toReviewableDraftTasks(tasks: DraftWorkspaceTask[]): ReviewableDraftTask[] {
  return tasks.map((task) => ({
    id: task.id,
    intent: task.intent as ReviewableDraftTask['intent'],
    target: task.target,
    title: task.title,
    cleanTitle: task.cleanTitle,
    cleanContent: task.cleanContent,
    captureMode: task.captureMode,
    clarifyReason: task.clarifyReason,
    repeatRelation: task.repeatRelation,
    targetConfidence: task.targetConfidence,
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

async function quickPlanDraftTasks(
  ctx: PhaseContext,
  tasks: DraftWorkspaceTask[],
  options: OrchestrateWorkspaceRunOptions
): Promise<{ draftTasks: DraftWorkspaceTask[]; plannerResult: WorkspaceRunPlannerResult }> {
  const planStartTs = Date.now()
  emitEvent(ctx, { type: 'phase_started', phase: 'plan' })
  const plannerResult = await planWorkspaceRun({
    userId: options.userId,
    draftTasks: tasks,
    searchCandidates: options.searchCandidates,
    runPlanHints: async () => null,
  })
  emitEvent(ctx, { type: 'phase_completed', phase: 'plan', output: plannerResult })
  recordPhaseTiming(ctx.phaseTimings, 'plan', planStartTs, Date.now(), 'orchestration')
  return {
    draftTasks: tasks,
    plannerResult,
  }
}

async function replanDraftTasks(
  ctx: PhaseContext,
  tasks: DraftWorkspaceTask[],
  options: OrchestrateWorkspaceRunOptions,
  referenceTime: string
): Promise<{ draftTasks: DraftWorkspaceTask[]; plannerResult: WorkspaceRunPlannerResult }> {
  const timeNormalizeStartTs = Date.now()
  emitEvent(ctx, { type: 'phase_started', phase: 'time_normalize' })
  const normalizedDraftTasks = await normalizeTodoDraftTaskTimes(tasks, {
    referenceTime,
    signal: options.signal,
  })
  emitEvent(ctx, { type: 'phase_completed', phase: 'time_normalize', output: normalizedDraftTasks })
  recordPhaseTiming(ctx.phaseTimings, 'time_normalize', timeNormalizeStartTs, Date.now(), 'model')

  return quickPlanDraftTasks(ctx, normalizedDraftTasks, options)
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

async function runBatchCompose(
  ctx: PhaseContext,
  input: {
    preview: WorkspaceRunResult['preview']
    executeResult: Awaited<ReturnType<typeof runExecute>>
  }
) {
  const startTs = Date.now()
  emitEvent(ctx, { type: 'phase_started', phase: 'compose' })

  const result = {
    answer: buildBatchAnswer({
      plan: input.preview?.plan,
      executeResult: input.executeResult,
    }),
    usedFallback: true,
  }

  emitEvent(ctx, { type: 'phase_completed', phase: 'compose', output: result })
  recordPhaseTiming(ctx.phaseTimings, 'compose', startTs, Date.now(), 'orchestration')
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
      phaseTimings: input.ctx.phaseTimings,
    } as const
  }

  const firstOkStep = executeResult.stepResults.find((step) => step.result.ok)
  const firstOkResult = firstOkStep?.result

  if (!firstOkStep || !firstOkResult || !firstOkResult.ok) {
    return {
      ok: false,
      phase: 'execute',
      message: 'No successful step results',
      phaseTimings: input.ctx.phaseTimings,
    } as const
  }

  const firstTask = input.draftTasks[0]
  const toolName = firstOkStep.toolName
  const preview = buildWorkspaceRunPreview({
    runId: input.runId,
    understandingPreview:
      input.snapshot.preview?.understanding ?? input.snapshot.understandingPreview,
    plannerResult: input.plannerResult,
  })
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

  const completedResult = buildCompletedRunResult({
    executeResult,
    preview,
    answer: composeResult.answer,
    data: executeResult.stepResults.length > 1 ? null : firstOkResult,
  })

  emitEvent(input.ctx, {
    type: 'run_completed',
    result: completedResult,
  })

  return {
    ok: true,
    phase: 'completed',
    result: completedResult,
    phaseTimings: input.ctx.phaseTimings,
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
    phaseTimings: ctx.phaseTimings,
  } as const
}

export async function handleResume(
  options: OrchestrateWorkspaceRunOptions
): Promise<WorkspaceRunOrchestratorResult> {
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
    phaseTimings: [],
  }

  if (request.response.action === 'cancel') {
    return failRun(ctx, store, request.runId, userId, 'CANCELLED', '已取消这次处理。')
  }

  if (request.response.type === 'select_candidate' && request.response.action === 'skip') {
    return failRun(ctx, store, request.runId, userId, 'SKIPPED', '已跳过这次候选选择，没有执行更新。')
  }

  if (request.response.type === 'confirm_duplicate' && request.response.action === 'skip') {
    return failRun(ctx, store, request.runId, userId, 'SKIPPED', '已跳过这项，没有创建新内容。')
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
    if (snapshot.interaction.type !== 'clarify_slots') {
      return {
        ok: false,
        phase: 'invalid_state',
        message: 'Clarification response does not match pending interaction',
      }
    }

    draftTasks = mergeClarification(draftTasks, request.response, snapshot.interaction.fields)
  }

  const referenceTime = snapshot.referenceTime ?? snapshot.updatedAt

  const needsFullReplan =
    request.response.type === 'clarify_slots' ||
    (request.response.type === 'confirm_plan' && draftTasks.some(needsTodoTimeNormalization))

  let plannerResult: WorkspaceRunPlannerResult
  if (needsFullReplan) {
    const replanned = await replanDraftTasks(ctx, draftTasks, options, referenceTime)
    draftTasks = replanned.draftTasks
    plannerResult = replanned.plannerResult
  } else {
    const replanned = await quickPlanDraftTasks(ctx, draftTasks, options)
    draftTasks = replanned.draftTasks
    plannerResult = replanned.plannerResult
  }
  if (request.response.type === 'select_candidate' && request.response.action === 'select') {
    plannerResult = applySelectedCandidate(plannerResult, request.response.candidateId)
  }

  if (
    request.response.type === 'confirm_plan' ||
    request.response.type === 'select_candidate' ||
    request.response.type === 'confirm_duplicate'
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

  const reviewStartTs = Date.now()
  emitEvent(ctx, { type: 'phase_started', phase: 'review' })
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
    duplicateCandidates: [],
    duplicateReview: snapshot.duplicateReview,
  })

  emitEvent(ctx, { type: 'phase_completed', phase: 'review', output: reviewDecision })
  recordPhaseTiming(ctx.phaseTimings, 'review', reviewStartTs, Date.now(), 'orchestration')

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
      phaseTimings: ctx.phaseTimings,
    }
  }

  if (reviewDecision.status === 'await_user') {
    await store.failAwaitingRuns(userId, { excludeRunId: request.runId })
    await store.saveSnapshot(reviewDecision.snapshot, userId)
    emitEvent(ctx, {
      type: 'awaiting_user',
      interaction: reviewDecision.snapshot.interaction,
    })

    return {
      ok: true,
      phase: 'review',
      snapshot: reviewDecision.snapshot,
      phaseTimings: ctx.phaseTimings,
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
