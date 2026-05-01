import 'server-only'

import { ACTION_LABELS } from './workspace-run-action-labels'

import type {
  DraftWorkspaceTask,
  WorkspaceCandidate,
  WorkspaceDuplicateReviewState,
  WorkspaceInteraction,
  WorkspacePlanPreview,
  WorkspaceRunStreamEvent,
  WorkspaceUnderstandingPreview,
} from '@/shared/workspace/workspace-run-protocol'


export type WorkspaceCorrectionNote = string

export type ReviewableDraftTask = {
  id: string
  intent: 'create' | 'query' | 'summarize' | 'update'
  target: 'notes' | 'todos' | 'bookmarks' | 'mixed'
  title?: string
  confidence: number
  ambiguities: string[]
  corrections: string[]
  slots: Record<string, unknown>
}

export type ReviewableCandidate = {
  id: string
  type: 'todo'
  title: string
  confidence: number
  matchReason: string
}

export type ReviewablePlanStep = {
  id: string
  action:
    | 'create_note'
    | 'create_todo'
    | 'create_bookmark'
    | 'query_assets'
    | 'summarize_assets'
    | 'update_todo'
  target: 'notes' | 'todos' | 'bookmarks' | 'mixed'
  title?: string
  risk: 'low' | 'medium' | 'high'
  requiresUserApproval: boolean
  candidates?: ReviewableCandidate[]
}

export type ReviewablePlan = {
  summary: string
  steps: ReviewablePlanStep[]
}

export type WorkspaceReviewPendingRunSnapshot = {
  runId: string
  referenceTime?: string
  phase: 'review'
  status: 'awaiting_user'
  interactionId: string
  interaction: WorkspaceInteraction
  timeline: WorkspaceRunStreamEvent[]
  preview: {
    understanding?: WorkspaceUnderstandingPreview
    plan?: WorkspacePlanPreview
  } | null
  understandingPreview: WorkspaceUnderstandingPreview | null
  correctionNotes: WorkspaceCorrectionNote[]
  duplicateReview?: WorkspaceDuplicateReviewState
  updatedAt: string
}

export type WorkspacePendingRunSnapshot = WorkspaceReviewPendingRunSnapshot

type ReviewWorkspaceRunPlanInput = {
  runId: string
  draftTasks: ReviewableDraftTask[]
  plan: ReviewablePlan
  understandingPreview: WorkspaceUnderstandingPreview | null
  updatedAt: string
  referenceTime?: string
  draftTasksConfirmed?: boolean
  duplicateCandidates?: ReviewableDuplicateCandidate[]
  duplicateReview?: WorkspaceDuplicateReviewState
}

export type ReviewWorkspaceRunPlanDecision =
  | {
      status: 'reject'
      reason: 'invalid_plan'
    }
  | {
      status: 'auto_execute'
      reason: 'single_low_risk_clear_task'
      snapshot: null
    }
  | {
      status: 'await_user'
      reason:
        | 'edit_draft_tasks'
        | 'confirm_duplicate'
        | 'select_candidate'
        | 'clarify_slots'
        | 'confirm_plan'
      snapshot: WorkspaceReviewPendingRunSnapshot
    }

export type ReviewableDuplicateCandidate = {
  stepId: string
  target: 'todo' | 'note' | 'bookmark'
  duplicates: WorkspaceCandidate[]
}

const MIN_AUTO_EXECUTE_CONFIDENCE = 0.78

function createInteractionId(runId: string, suffix: string) {
  return `${runId}_${suffix}`
}

function mapPlanStepToPreviewStep(step: ReviewablePlanStep) {
  return {
    id: step.id,
    toolName: step.action,
    title: ACTION_LABELS[step.action],
    preview: `${ACTION_LABELS[step.action]}：${step.title ?? ''}`.trimEnd(),
  }
}

function toPlanPreview(plan: ReviewablePlan): WorkspacePlanPreview {
  return {
    summary: plan.summary,
    steps: plan.steps.map(mapPlanStepToPreviewStep),
  }
}

function buildSnapshot(input: {
  runId: string
  referenceTime?: string
  interaction: WorkspaceReviewPendingRunSnapshot['interaction']
  understandingPreview: WorkspaceUnderstandingPreview | null
  plan: ReviewablePlan
  updatedAt: string
  correctionNotes?: WorkspaceCorrectionNote[]
  duplicateReview?: WorkspaceDuplicateReviewState
}): WorkspaceReviewPendingRunSnapshot {
  const planPreview = toPlanPreview(input.plan)

  return {
    runId: input.runId,
    referenceTime: input.referenceTime ?? input.updatedAt,
    phase: 'review',
    status: 'awaiting_user',
    interactionId: input.interaction.id,
    interaction: input.interaction,
    timeline: [
      {
        type: 'phase_started',
        phase: 'review',
      },
      {
        type: 'awaiting_user',
        interaction: input.interaction,
      },
    ],
    preview: {
      ...(input.understandingPreview ? { understanding: input.understandingPreview } : {}),
      plan: planPreview,
    },
    understandingPreview: input.understandingPreview,
    correctionNotes: input.correctionNotes ?? input.understandingPreview?.corrections ?? [],
    duplicateReview: input.duplicateReview,
    updatedAt: input.updatedAt,
  }
}

function toInteractionCandidates(candidates: ReviewableCandidate[]): WorkspaceCandidate[] {
  return candidates.map((candidate) => ({
    id: candidate.id,
    label: candidate.title,
    reason: `${candidate.matchReason} (${Math.round(candidate.confidence * 100)}%)`,
  }))
}

function serializeDraftTask(task: ReviewableDraftTask): DraftWorkspaceTask {
  const slots: Record<string, string> = {}
  for (const [key, value] of Object.entries(task.slots)) {
    if (typeof value === 'string') {
      slots[key] = value
    }
  }

  return {
    ...task,
    title: task.title ?? '',
    slots,
  }
}

function buildClarifyFields(task: ReviewableDraftTask) {
  const url = typeof task.slots.url === 'string' ? task.slots.url.trim() : ''
  const slotTitle = typeof task.slots.title === 'string' ? task.slots.title.trim() : null
  if (task.target === 'bookmarks') {
    const hasTitle = (task.title?.trim() ?? '').length > 0 || (slotTitle ?? '').length > 0

    return [
      {
        key: 'url',
        label: '书签链接',
        required: true,
        placeholder: 'https://example.com',
      },
      {
        key: 'title',
        label: '标题',
        required: true,
        placeholder: '请输入标题',
      },
    ].filter((field) => {
      if (field.key === 'url') {
        return !url
      }

      return !hasTitle
    })
  }

  if (Object.prototype.hasOwnProperty.call(task.slots, 'title') && slotTitle !== null && slotTitle.length === 0) {
    const hasTitle = (task.title?.trim() ?? '').length > 0
    if (hasTitle) {
      return []
    }

    return [
      {
        key: 'title',
        label: '标题',
        required: true,
        placeholder: '请输入标题',
      },
    ]
  }

  return [
    {
      key: 'details',
      label: '请补充任务信息',
      required: true,
      placeholder: '告诉我你想更新或创建什么',
    },
  ]
}

function hasMissingRequiredWriteFields(task: ReviewableDraftTask, step: ReviewablePlanStep) {
  if (
    step.action === 'create_note' ||
    step.action === 'create_todo' ||
    step.action === 'create_bookmark'
  ) {
    if (Object.prototype.hasOwnProperty.call(task.slots, 'title')) {
      const slotTitle = typeof task.slots.title === 'string' ? task.slots.title.trim() : ''
      return slotTitle.length === 0
    }

    if ((task.title?.trim() ?? '').length === 0) {
      return true
    }
  }

  if (step.action === 'create_bookmark') {
    const url = typeof task.slots.url === 'string' ? task.slots.url.trim() : ''
    return !url
  }

  return false
}

function isStepConsistentWithTask(task: ReviewableDraftTask, step: ReviewablePlanStep) {
  const isActionAllowed =
    (task.intent === 'create' &&
      (step.action === 'create_note' ||
        step.action === 'create_todo' ||
        step.action === 'create_bookmark')) ||
    (task.intent === 'query' && step.action === 'query_assets') ||
    (task.intent === 'summarize' && step.action === 'summarize_assets') ||
    (task.intent === 'update' && step.action === 'update_todo')

  if (!isActionAllowed) {
    return false
  }

  if (task.target !== 'mixed' && step.target !== task.target) {
    return false
  }

  return true
}

function hasWriteTitleDrift(task: ReviewableDraftTask, step: ReviewablePlanStep) {
  if (
    step.action !== 'create_note' &&
    step.action !== 'create_todo' &&
    step.action !== 'create_bookmark'
  ) {
    return false
  }

  const stepTitle = step.title?.trim()
  if (!stepTitle) {
    return false
  }

  const slotTitle = typeof task.slots.title === 'string' ? task.slots.title.trim() : ''
  const taskTitle = task.title?.trim() ?? ''
  const baselineTitle = slotTitle || taskTitle

  if (!baselineTitle) {
    return false
  }

  return baselineTitle !== stepTitle
}

function hasOnlyIgnorableTodoTimeAmbiguities(task: ReviewableDraftTask, step: ReviewablePlanStep) {
  if (task.target !== 'todos' || step.action !== 'create_todo') {
    return false
  }

  if (task.ambiguities.length === 0) {
    return false
  }

  return task.ambiguities.every((ambiguity) => /^时间表述.+不明确$/.test(ambiguity))
}

function getCorrectionNotes(input: ReviewWorkspaceRunPlanInput, task: ReviewableDraftTask) {
  return [...new Set([...task.corrections, ...(input.understandingPreview?.corrections ?? [])])]
}

function buildConfirmPlanDecision(input: {
  runId: string
  plan: ReviewablePlan
  understandingPreview: WorkspaceUnderstandingPreview | null
  updatedAt: string
  referenceTime?: string
  message: string
  correctionNotes?: WorkspaceCorrectionNote[]
  duplicateReview?: WorkspaceDuplicateReviewState
}): {
  status: 'await_user'
  reason: 'confirm_plan'
  snapshot: WorkspaceReviewPendingRunSnapshot
} {
  const interactionId = createInteractionId(input.runId, 'confirm_plan')

  return {
    status: 'await_user',
    reason: 'confirm_plan',
    snapshot: buildSnapshot({
      runId: input.runId,
      referenceTime: input.referenceTime,
      interaction: {
        runId: input.runId,
        id: interactionId,
        type: 'confirm_plan',
        message: input.message,
        actions: ['confirm', 'edit', 'cancel'],
        plan: toPlanPreview(input.plan),
      },
      understandingPreview: input.understandingPreview,
      plan: input.plan,
      updatedAt: input.updatedAt,
      correctionNotes: input.correctionNotes,
      duplicateReview: input.duplicateReview,
    }),
  }
}

function buildClarifyDecision(input: {
  runId: string
  plan: ReviewablePlan
  understandingPreview: WorkspaceUnderstandingPreview | null
  updatedAt: string
  referenceTime?: string
  interactionIdSuffix: string
  message: string
  fields: Extract<WorkspaceInteraction, { type: 'clarify_slots' }>['fields']
}): {
  status: 'await_user'
  reason: 'clarify_slots'
  snapshot: WorkspaceReviewPendingRunSnapshot
} {
  const interactionId = createInteractionId(input.runId, input.interactionIdSuffix)

  return {
    status: 'await_user',
    reason: 'clarify_slots',
    snapshot: buildSnapshot({
      runId: input.runId,
      referenceTime: input.referenceTime,
      interaction: {
        runId: input.runId,
        id: interactionId,
        type: 'clarify_slots',
        message: input.message,
        actions: ['submit', 'cancel'],
        fields: input.fields,
      },
      understandingPreview: input.understandingPreview,
      plan: input.plan,
      updatedAt: input.updatedAt,
    }),
  }
}

function buildEditDraftTasksDecision(input: {
  runId: string
  draftTasks: ReviewableDraftTask[]
  plan: ReviewablePlan
  understandingPreview: WorkspaceUnderstandingPreview | null
  updatedAt: string
  referenceTime?: string
}): {
  status: 'await_user'
  reason: 'edit_draft_tasks'
  snapshot: WorkspaceReviewPendingRunSnapshot
} {
  const interactionId = createInteractionId(input.runId, 'edit_draft_tasks')

  return {
    status: 'await_user',
    reason: 'edit_draft_tasks',
    snapshot: buildSnapshot({
      runId: input.runId,
      referenceTime: input.referenceTime,
      interaction: {
        runId: input.runId,
        id: interactionId,
        type: 'edit_draft_tasks',
        message: '这次请求包含多个草稿任务，请先确认或编辑。',
        actions: ['save', 'cancel'],
        tasks: input.draftTasks.map(serializeDraftTask),
      },
      understandingPreview: input.understandingPreview,
      plan: input.plan,
      updatedAt: input.updatedAt,
    }),
  }
}

function getUnresolvedDuplicateCandidate(input: ReviewWorkspaceRunPlanInput) {
  const decisions = new Set((input.duplicateReview?.decisions ?? []).map((decision) => decision.stepId))

  return (input.duplicateCandidates ?? []).find((candidate) => !decisions.has(candidate.stepId))
}

function canAutoExecuteConfirmedMultiTask(input: ReviewWorkspaceRunPlanInput) {
  if (input.draftTasks.length <= 1 || !input.draftTasksConfirmed) {
    return false
  }

  if ((input.duplicateReview?.decisions ?? []).length === 0) {
    return false
  }

  return input.plan.steps.length > 0 && input.plan.steps.every(
    (step) => step.risk === 'low' && step.requiresUserApproval === false
  )
}

function buildConfirmDuplicateDecision(input: {
  runId: string
  plan: ReviewablePlan
  understandingPreview: WorkspaceUnderstandingPreview | null
  updatedAt: string
  referenceTime?: string
  candidate: ReviewableDuplicateCandidate
  duplicateReview?: WorkspaceDuplicateReviewState
}): {
  status: 'await_user'
  reason: 'confirm_duplicate'
  snapshot: WorkspaceReviewPendingRunSnapshot
} {
  const interactionId = createInteractionId(input.runId, `confirm_duplicate_${input.candidate.stepId}`)
  const step = input.plan.steps.find((planStep) => planStep.id === input.candidate.stepId)
  const previewStep = step ? mapPlanStepToPreviewStep(step) : null
  const targetLabelMap = {
    todo: '待办',
    note: '笔记',
    bookmark: '书签',
  } as const

  return {
    status: 'await_user',
    reason: 'confirm_duplicate',
    snapshot: buildSnapshot({
      runId: input.runId,
      referenceTime: input.referenceTime,
      interaction: {
        runId: input.runId,
        id: interactionId,
        type: 'confirm_duplicate',
        target: input.candidate.target,
        message: `发现可能重复的${targetLabelMap[input.candidate.target]}，请确认是否仍然创建。`,
        actions: ['create', 'skip', 'cancel'],
        current: {
          stepId: input.candidate.stepId,
          title: step?.title ?? previewStep?.title ?? '创建内容',
          preview: previewStep?.preview ?? '创建内容',
        },
        duplicates: input.candidate.duplicates,
      },
      understandingPreview: input.understandingPreview,
      plan: input.plan,
      updatedAt: input.updatedAt,
      duplicateReview: input.duplicateReview,
    }),
  }
}

function buildUpdateDecision(input: {
  runId: string
  plan: ReviewablePlan
  understandingPreview: WorkspaceUnderstandingPreview | null
  updatedAt: string
  referenceTime?: string
  candidates: ReviewableCandidate[]
}): {
  status: 'await_user'
  reason: 'select_candidate' | 'clarify_slots' | 'confirm_plan'
  snapshot: WorkspaceReviewPendingRunSnapshot
} {
  if (input.candidates.length > 1) {
    const interactionId = createInteractionId(input.runId, 'select_candidate')

    return {
      status: 'await_user',
      reason: 'select_candidate',
      snapshot: buildSnapshot({
        runId: input.runId,
        referenceTime: input.referenceTime,
        interaction: {
          runId: input.runId,
          id: interactionId,
          type: 'select_candidate',
          target: 'todo',
          message: '找到多个可更新待办，请选择。',
          actions: ['select', 'skip', 'cancel'],
          candidates: toInteractionCandidates(input.candidates),
        },
        understandingPreview: input.understandingPreview,
        plan: input.plan,
        updatedAt: input.updatedAt,
      }),
    }
  }

  if (input.candidates.length === 1) {
    const candidateTitle = input.candidates[0]?.title ?? '该待办'
    return buildConfirmPlanDecision({
      runId: input.runId,
      plan: input.plan,
      understandingPreview: input.understandingPreview,
      updatedAt: input.updatedAt,
      referenceTime: input.referenceTime,
      message: `找到一个待更新候选：${candidateTitle}，请确认后执行。`,
    })
  }

  return buildClarifyDecision({
    runId: input.runId,
    plan: input.plan,
    understandingPreview: input.understandingPreview,
    updatedAt: input.updatedAt,
    referenceTime: input.referenceTime,
    interactionIdSuffix: 'clarify_update',
    message: '没有找到明确的待办，请补充识别信息。',
    fields: [
      {
        key: 'query',
        label: '待办关键词',
        required: true,
        placeholder: '例如：给客户发报价',
      },
    ],
  })
}

export function reviewWorkspaceRunPlan(
  input: ReviewWorkspaceRunPlanInput
): ReviewWorkspaceRunPlanDecision {
  if (input.draftTasks.length === 0 || input.plan.steps.length === 0) {
    return {
      status: 'reject',
      reason: 'invalid_plan',
    }
  }

  if (input.draftTasks.length === 1 && input.plan.steps.length !== 1) {
    return {
      status: 'reject',
      reason: 'invalid_plan',
    }
  }

  if (input.draftTasks.length > 1 && !input.draftTasksConfirmed) {
    return buildEditDraftTasksDecision({
      runId: input.runId,
      draftTasks: input.draftTasks,
      plan: input.plan,
      understandingPreview: input.understandingPreview,
      updatedAt: input.updatedAt,
      referenceTime: input.referenceTime,
    })
  }

  if (input.draftTasks.length > 1) {
    const duplicateCandidate = getUnresolvedDuplicateCandidate(input)
    if (duplicateCandidate) {
      return buildConfirmDuplicateDecision({
        runId: input.runId,
        plan: input.plan,
        understandingPreview: input.understandingPreview,
        updatedAt: input.updatedAt,
        referenceTime: input.referenceTime,
        candidate: duplicateCandidate,
        duplicateReview: input.duplicateReview,
      })
    }

    if (canAutoExecuteConfirmedMultiTask(input)) {
      return {
        status: 'auto_execute',
        reason: 'single_low_risk_clear_task',
        snapshot: null,
      }
    }

    return buildConfirmPlanDecision({
      runId: input.runId,
      plan: input.plan,
      understandingPreview: input.understandingPreview,
      updatedAt: input.updatedAt,
      referenceTime: input.referenceTime,
      message: '草稿任务已确认，请确认执行计划。',
      duplicateReview: input.duplicateReview,
    })
  }

  const task = input.draftTasks[0]
  const step = input.plan.steps[0]

  if (step?.action === 'update_todo') {
    if (!isStepConsistentWithTask(task, step)) {
      return {
        status: 'reject',
        reason: 'invalid_plan',
      }
    }

    return buildUpdateDecision({
      runId: input.runId,
      plan: input.plan,
      understandingPreview: input.understandingPreview,
      updatedAt: input.updatedAt,
      referenceTime: input.referenceTime,
      candidates: step.candidates ?? [],
    })
  }

  if (task.confidence < MIN_AUTO_EXECUTE_CONFIDENCE) {
    return buildClarifyDecision({
      runId: input.runId,
      plan: input.plan,
      understandingPreview: input.understandingPreview,
      updatedAt: input.updatedAt,
      referenceTime: input.referenceTime,
      interactionIdSuffix: 'clarify_confidence',
      message: '这条任务的意图还不够确定，请补充说明。',
      fields: buildClarifyFields(task),
    })
  }

  if (task.ambiguities.length > 0 && !hasOnlyIgnorableTodoTimeAmbiguities(task, step)) {
    return buildClarifyDecision({
      runId: input.runId,
      plan: input.plan,
      understandingPreview: input.understandingPreview,
      updatedAt: input.updatedAt,
      referenceTime: input.referenceTime,
      interactionIdSuffix: 'clarify_ambiguity',
      message: '还有未消除的歧义，请先澄清。',
      fields: buildClarifyFields(task),
    })
  }

  if (task && step && hasMissingRequiredWriteFields(task, step)) {
    return buildClarifyDecision({
      runId: input.runId,
      plan: input.plan,
      understandingPreview: input.understandingPreview,
      updatedAt: input.updatedAt,
      referenceTime: input.referenceTime,
      interactionIdSuffix: 'clarify_required_fields',
      message: '执行前还缺少必要字段，请补充。',
      fields: buildClarifyFields(task),
    })
  }

  if (!isStepConsistentWithTask(task, step)) {
    return {
      status: 'reject',
      reason: 'invalid_plan',
    }
  }

  const duplicateCandidate = getUnresolvedDuplicateCandidate(input)
  if (duplicateCandidate) {
    return buildConfirmDuplicateDecision({
      runId: input.runId,
      plan: input.plan,
      understandingPreview: input.understandingPreview,
      updatedAt: input.updatedAt,
      referenceTime: input.referenceTime,
      candidate: duplicateCandidate,
      duplicateReview: input.duplicateReview,
    })
  }

  const correctionNotes = getCorrectionNotes(input, task)

  if (correctionNotes.length > 0) {
    return buildConfirmPlanDecision({
      runId: input.runId,
      plan: input.plan,
      understandingPreview: input.understandingPreview,
      updatedAt: input.updatedAt,
      referenceTime: input.referenceTime,
      message: '检测到纠正内容，请确认再执行。',
      correctionNotes,
      duplicateReview: input.duplicateReview,
    })
  }

  if (hasWriteTitleDrift(task, step)) {
    return buildConfirmPlanDecision({
      runId: input.runId,
      plan: input.plan,
      understandingPreview: input.understandingPreview,
      updatedAt: input.updatedAt,
      referenceTime: input.referenceTime,
      message: '计划标题与原始写入标题存在差异，请确认后执行。',
      duplicateReview: input.duplicateReview,
    })
  }

  if (
    input.draftTasks.length === 1 &&
    input.plan.steps.length === 1 &&
    step &&
    task.target !== 'mixed' &&
    isStepConsistentWithTask(task, step) &&
    step.risk === 'low' &&
    step.requiresUserApproval === false
  ) {
    return {
      status: 'auto_execute',
      reason: 'single_low_risk_clear_task',
      snapshot: null,
    }
  }

  return buildConfirmPlanDecision({
    runId: input.runId,
    plan: input.plan,
    understandingPreview: input.understandingPreview,
    updatedAt: input.updatedAt,
    referenceTime: input.referenceTime,
    message: '请确认执行计划。',
    duplicateReview: input.duplicateReview,
  })
}
