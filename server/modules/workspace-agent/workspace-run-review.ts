import 'server-only'

import { ACTION_LABELS } from './workspace-run-action-labels'

import type {
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
  cleanTitle?: string
  cleanContent?: string
  captureMode?: 'todo_capture' | 'note_capture' | 'bookmark_capture' | 'none'
  clarifyReason?: 'unknown_target' | 'missing_content' | 'missing_time_precision' | 'ambiguous_reference' | 'none'
  repeatRelation?: 'independent' | 'continuation' | 'modifier' | 'duplicate_of_previous'
  targetConfidence?: number
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
  status?: 'open' | 'done'
  createdAt?: string
  updatedAt?: string
  dueAt?: string
  timeText?: string
  preview?: string
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
        | 'confirm_duplicate'
        | 'select_candidate'
        | 'clarify_slots'
        | 'confirm_plan'
      snapshot: WorkspaceReviewPendingRunSnapshot
    }

export type ReviewableDuplicateCandidate = {
  stepId: string
  target: 'todo' | 'note' | 'bookmark'
  source?: 'precheck'
  duplicates: WorkspaceCandidate[]
}

function createInteractionId(runId: string, suffix: string) {
  return `${runId}_${suffix}`
}

function toPlanPreview(plan: ReviewablePlan): WorkspacePlanPreview {
  return {
    summary: plan.summary,
    steps: plan.steps.map((step) => ({
      id: step.id,
      toolName: step.action,
      title: ACTION_LABELS[step.action],
      preview: `${ACTION_LABELS[step.action]}：${step.title ?? ''}`.trimEnd(),
    })),
  }
}

function buildSnapshot(input: {
  runId: string
  referenceTime?: string
  interaction: WorkspaceInteraction
  understandingPreview: WorkspaceUnderstandingPreview | null
  plan: ReviewablePlan
  updatedAt: string
  correctionNotes?: WorkspaceCorrectionNote[]
  duplicateReview?: WorkspaceDuplicateReviewState
}): WorkspaceReviewPendingRunSnapshot {
  return {
    runId: input.runId,
    referenceTime: input.referenceTime ?? input.updatedAt,
    phase: 'review',
    status: 'awaiting_user',
    interactionId: input.interaction.id,
    interaction: input.interaction,
    timeline: [
      { type: 'phase_started', phase: 'review' },
      { type: 'awaiting_user', interaction: input.interaction },
    ],
    preview: {
      ...(input.understandingPreview ? { understanding: input.understandingPreview } : {}),
      plan: toPlanPreview(input.plan),
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
    type: candidate.type,
    status: candidate.status,
    createdAt: candidate.createdAt,
    updatedAt: candidate.updatedAt,
    dueAt: candidate.dueAt,
    timeText: candidate.timeText,
    preview: candidate.preview ?? candidate.title,
    reason: `${candidate.matchReason} (${Math.round(candidate.confidence * 100)}%)`,
  }))
}

function getCorrectionNotes(input: ReviewWorkspaceRunPlanInput, task: ReviewableDraftTask) {
  return input.understandingPreview?.corrections ?? task.corrections ?? []
}

function getUnresolvedDuplicateCandidate(input: ReviewWorkspaceRunPlanInput) {
  return (input.duplicateCandidates ?? [])[0] ?? null
}

function isStepConsistentWithTask(task: ReviewableDraftTask, step: ReviewablePlanStep) {
  if (task.intent === 'update') {
    return step.action === 'update_todo' && task.target === 'todos'
  }

  if (task.intent === 'query') {
    return step.action === 'query_assets'
  }

  if (task.intent === 'summarize') {
    return step.action === 'summarize_assets'
  }

  if (task.intent !== 'create') {
    return false
  }

  if (task.target === 'notes') return step.action === 'create_note'
  if (task.target === 'todos') return step.action === 'create_todo'
  if (task.target === 'bookmarks') return step.action === 'create_bookmark'
  return (
    step.target === 'mixed' ||
    step.action === 'create_note' ||
    step.action === 'create_todo' ||
    step.action === 'create_bookmark'
  )
}

function buildClarifyFields(task: ReviewableDraftTask, step?: ReviewablePlanStep) {
  if (task.intent === 'query') {
    return [
      {
        key: 'query',
        label: '查询关键词',
        required: true,
        input: 'text' as const,
        placeholder: '例如：RQA0507R7 或 刚刚记的验收结论',
      },
    ]
  }

  if (task.intent === 'summarize') {
    return [
      {
        key: 'query',
        label: '整理范围',
        required: true,
        input: 'text' as const,
        placeholder: '例如：最近的 RQA0507R7 相关内容',
      },
    ]
  }

  if (task.target === 'mixed') {
    return [
      {
        key: 'target',
        label: '记录类型',
        required: true,
        input: 'select' as const,
        placeholder: '请选择记录类型',
        options: [
          { value: 'todos', label: '待办' },
          { value: 'notes', label: '笔记' },
          { value: 'bookmarks', label: '书签' },
        ],
      },
      {
        key: 'details',
        label: '具体内容',
        required: true,
        input: 'text' as const,
        placeholder: '例如：普通用户希望一句话直接保存',
      },
    ]
  }

  if (task.target === 'bookmarks' || step?.action === 'create_bookmark') {
    return [
      {
        key: 'url',
        label: '链接',
        required: true,
        input: 'text' as const,
        placeholder: 'https://example.com',
      },
      {
        key: 'details',
        label: '补充说明',
        required: false,
        input: 'text' as const,
        placeholder: '可选备注',
      },
    ]
  }

  if (task.target === 'todos' && task.clarifyReason === 'missing_time_precision') {
    return [
      {
        key: 'timeText',
        label: '具体时间',
        required: true,
        input: 'text' as const,
        placeholder: '例如：下周三下午 3 点',
      },
    ]
  }

  return [
    {
      key: 'details',
      label: '具体内容',
      required: true,
      input: 'text' as const,
      placeholder: task.target === 'todos' ? '例如：明天早上买燕麦奶' : '请补充要保存的内容',
    },
  ]
}

function buildClarifyDecision(input: {
  runId: string
  plan: ReviewablePlan
  understandingPreview: WorkspaceUnderstandingPreview | null
  updatedAt: string
  referenceTime?: string
  message: string
  fields: Extract<WorkspaceInteraction, { type: 'clarify_slots' }>['fields']
  correctionNotes?: WorkspaceCorrectionNote[]
}): Extract<ReviewWorkspaceRunPlanDecision, { status: 'await_user' }> {
  const interactionId = createInteractionId(input.runId, 'clarify_slots')
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
      correctionNotes: input.correctionNotes,
    }),
  }
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
}): Extract<ReviewWorkspaceRunPlanDecision, { status: 'await_user' }> {
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
        actions: ['confirm', 'cancel'],
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

function buildConfirmDuplicateDecision(input: {
  runId: string
  plan: ReviewablePlan
  understandingPreview: WorkspaceUnderstandingPreview | null
  updatedAt: string
  referenceTime?: string
  candidate: ReviewableDuplicateCandidate
  duplicateReview?: WorkspaceDuplicateReviewState
}): Extract<ReviewWorkspaceRunPlanDecision, { status: 'await_user' }> {
  const step = input.plan.steps.find((item) => item.id === input.candidate.stepId)
  if (!step) {
    return buildConfirmPlanDecision({
      runId: input.runId,
      plan: input.plan,
      understandingPreview: input.understandingPreview,
      updatedAt: input.updatedAt,
      referenceTime: input.referenceTime,
      message: '发现了需要确认的重复内容，请确认执行计划。',
      duplicateReview: input.duplicateReview,
    })
  }

  const interactionId = createInteractionId(input.runId, `confirm_duplicate_${step.id}`)

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
        source: input.candidate.source,
        target: input.candidate.target,
        message: '发现可能重复的内容，请确认。',
        actions: ['create', 'skip', 'cancel'],
        current: {
          stepId: step.id,
          title: step.title ?? '',
          preview: `${ACTION_LABELS[step.action]}：${step.title ?? ''}`.trimEnd(),
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

function buildSelectCandidateDecision(input: {
  runId: string
  plan: ReviewablePlan
  understandingPreview: WorkspaceUnderstandingPreview | null
  updatedAt: string
  referenceTime?: string
  candidates: ReviewableCandidate[]
}): Extract<ReviewWorkspaceRunPlanDecision, { status: 'await_user' }> {
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

function shouldClarify(task: ReviewableDraftTask, step?: ReviewablePlanStep) {
  if (task.confidence < 0.4) return true
  const queryText = typeof task.slots.query === 'string' ? task.slots.query.trim() : ''

  if (task.intent === 'query' || task.intent === 'summarize') {
    if (task.ambiguities.length > 0) return true
    if (
      task.clarifyReason &&
      task.clarifyReason !== 'none' &&
      task.clarifyReason !== 'unknown_target'
    ) {
      return true
    }

    if (task.target === 'mixed') {
      if (task.intent === 'summarize') {
        const title = task.title?.trim() ?? ''
        return title.length === 0 && queryText.length === 0
      }
      return queryText.length === 0
    }

    const title = task.title?.trim() ?? ''
    return title.length === 0 && queryText.length === 0
  }

  if (task.target === 'mixed') return true
  if (task.clarifyReason && task.clarifyReason !== 'none') return true
  if (task.ambiguities.length > 0) return true

  if (task.intent === 'create') {
    const title = task.title?.trim() ?? ''
    if (title.length === 0 && step?.action !== 'create_bookmark') {
      return true
    }
    if ((task.target === 'bookmarks' || step?.action === 'create_bookmark') && typeof task.slots.url !== 'string') {
      return true
    }
  }

  return false
}

function buildClarifyMessage(task: ReviewableDraftTask, step?: ReviewablePlanStep) {
  if (task.intent === 'query') return '我知道你想查找内容，但还缺更具体的关键词。'
  if (task.intent === 'summarize') return '我知道你想整理内容，但还缺更具体的范围或对象。'

  if (task.target === 'mixed' || task.clarifyReason === 'unknown_target') {
    return '我还不确定你是想记待办、笔记还是书签。'
  }

  if (task.target === 'todos' && task.clarifyReason === 'missing_time_precision') {
    return '我知道你想记待办，但时间还不够具体。'
  }

  if (step?.action === 'create_todo') return '我知道你想记待办，但还缺具体内容。'
  if (step?.action === 'create_note') return '我知道你想记笔记，但还缺具体内容。'
  if (step?.action === 'create_bookmark') return '我知道你想存书签，但还缺链接。'

  return '执行前还缺少必要信息，请补充。'
}

export function reviewWorkspaceRunPlan(
  input: ReviewWorkspaceRunPlanInput
): ReviewWorkspaceRunPlanDecision {
  if (input.draftTasks.length === 0 || input.plan.steps.length === 0) {
    return { status: 'reject', reason: 'invalid_plan' }
  }

  if (input.draftTasks.length !== input.plan.steps.length) {
    return { status: 'reject', reason: 'invalid_plan' }
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

    return buildConfirmPlanDecision({
      runId: input.runId,
      plan: input.plan,
      understandingPreview: input.understandingPreview,
      updatedAt: input.updatedAt,
      referenceTime: input.referenceTime,
      message: `我识别到 ${input.draftTasks.length} 条内容，确认后会分别处理。`,
      correctionNotes: input.understandingPreview?.corrections ?? [],
      duplicateReview: input.duplicateReview,
    })
  }

  const task = input.draftTasks[0]
  const step = input.plan.steps[0]

  if (!task || !step || !isStepConsistentWithTask(task, step)) {
    return { status: 'reject', reason: 'invalid_plan' }
  }

  if (shouldClarify(task, step)) {
    return buildClarifyDecision({
      runId: input.runId,
      plan: input.plan,
      understandingPreview: input.understandingPreview,
      updatedAt: input.updatedAt,
      referenceTime: input.referenceTime,
      message: buildClarifyMessage(task, step),
      fields: buildClarifyFields(task, step),
      correctionNotes: getCorrectionNotes(input, task),
    })
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

  if (step.action === 'update_todo') {
    const candidates = step.candidates ?? []

    if (candidates.length > 1) {
      return buildSelectCandidateDecision({
        runId: input.runId,
        plan: input.plan,
        understandingPreview: input.understandingPreview,
        updatedAt: input.updatedAt,
        referenceTime: input.referenceTime,
        candidates,
      })
    }

    if (candidates.length === 0) {
      return buildClarifyDecision({
        runId: input.runId,
        plan: input.plan,
        understandingPreview: input.understandingPreview,
        updatedAt: input.updatedAt,
        referenceTime: input.referenceTime,
        message: '没有找到明确的待办，请补充识别信息。',
        fields: [
          {
            key: 'query',
            label: '待办关键词',
            required: true,
            input: 'text' as const,
            placeholder: '例如：给客户发报价',
          },
        ],
      })
    }

    if (candidates[0].confidence < 0.7) {
      return buildConfirmPlanDecision({
        runId: input.runId,
        plan: input.plan,
        understandingPreview: input.understandingPreview,
        updatedAt: input.updatedAt,
        referenceTime: input.referenceTime,
        message: `找到一个待更新候选：${candidates[0].title}，请确认后执行。`,
        correctionNotes: getCorrectionNotes(input, task),
      })
    }

    return {
      status: 'auto_execute',
      reason: 'single_low_risk_clear_task',
      snapshot: null,
    }
  }

  if (step.risk === 'low' && !step.requiresUserApproval) {
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
    correctionNotes: getCorrectionNotes(input, task),
    duplicateReview: input.duplicateReview,
  })
}
