import 'server-only'

import { renderPrompt } from '@/server/lib/prompt-template'

import type { DraftWorkspaceTask } from '@/shared/workspace/workspace-run-protocol'

export type WorkspaceRunPlannerAction =
  | 'create_note'
  | 'create_todo'
  | 'create_bookmark'
  | 'query_assets'
  | 'summarize_assets'
  | 'update_todo'

export type WorkspaceRunPlannerStep = {
  id: string
  action: WorkspaceRunPlannerAction
  target: 'notes' | 'todos' | 'bookmarks' | 'mixed'
  title?: string
  risk: 'low' | 'medium' | 'high'
  requiresUserApproval: boolean
  candidates?: WorkspaceRunPlannerCandidate[]
  toolInput?: Record<string, unknown>
}

export type WorkspaceRunPlannerCandidate = {
  id: string
  type: 'todo'
  title: string
  confidence: number
  matchReason: string
}

export type WorkspaceRunPlannerResult = {
  summary: string
  steps: WorkspaceRunPlannerStep[]
}

export type WorkspaceRunPlanHint = {
  action: WorkspaceRunPlannerAction
  title?: string
  query?: string
  reason?: string
}

export type RunPlanHints = (input: {
  draftTask: DraftWorkspaceTask
  userPrompt: string
}) => Promise<WorkspaceRunPlanHint | null | undefined>

export type SearchWorkspaceRunCandidates = (input: {
  userId: string
  target: 'todos'
  query: string
}) => Promise<WorkspaceRunPlannerCandidate[]>

function buildSummary(taskCount: number) {
  return `准备执行 ${taskCount} 个任务。`
}

function shouldUseHints(task: DraftWorkspaceTask) {
  const hasUrl = typeof task.slots.url === 'string' && task.slots.url.trim().length > 0
  const hasExtraText = Object.entries(task.slots).some(([key, value]) => {
    if (key === 'url') {
      return false
    }

    return typeof value === 'string' && value.trim().length > 0
  })

  return task.ambiguities.length > 0 || task.target === 'mixed' || (hasUrl && hasExtraText)
}

async function resolveHints(input: {
  task: DraftWorkspaceTask
  runPlanHints: RunPlanHints
}) {
  if (!shouldUseHints(input.task)) {
    return null
  }

  let userPrompt: string

  try {
    userPrompt = await renderPrompt('workspace-run/plan.user', {
      draftTaskJson: JSON.stringify(input.task),
    })
  } catch {
    return null
  }

  try {
    const payload = await input.runPlanHints({
      draftTask: input.task,
      userPrompt,
    })

    if (!payload || typeof payload !== 'object') {
      return null
    }

    if (!isValidHintAction((payload as { action?: unknown }).action)) {
      return null
    }

    return {
      action: payload.action,
      title: typeof payload.title === 'string' ? payload.title : undefined,
      query: typeof payload.query === 'string' ? payload.query : undefined,
      reason: typeof payload.reason === 'string' ? payload.reason : undefined,
    }
  } catch {
    return null
  }
}

function resolveTitle(task: DraftWorkspaceTask, hints: WorkspaceRunPlanHint | null) {
  const hintedTitle = hints?.title?.trim()
  if (hintedTitle) {
    return hintedTitle
  }

  const taskTitle = task.title.trim()
  return taskTitle.length > 0 ? taskTitle : undefined
}

function getStringSlot(task: DraftWorkspaceTask, key: string) {
  const value = task.slots[key]
  if (typeof value !== 'string') {
    return undefined
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function isIsoDateTime(value: string | undefined) {
  if (!value) {
    return false
  }

  return !Number.isNaN(Date.parse(value)) && value.includes('T')
}

function buildToolInput(task: DraftWorkspaceTask, action: WorkspaceRunPlannerAction, title?: string) {
  if (action === 'create_note') {
    return {
      content: getStringSlot(task, 'content') ?? title ?? task.title.trim(),
    }
  }

  if (action === 'create_todo') {
    const slotDueAt = getStringSlot(task, 'dueAt')

    return {
      title: title ?? task.title.trim(),
      details: getStringSlot(task, 'details') ?? getStringSlot(task, 'content'),
      timeText: getStringSlot(task, 'timeText') ?? (isIsoDateTime(slotDueAt) ? undefined : slotDueAt),
      dueAt: isIsoDateTime(slotDueAt) && slotDueAt ? new Date(slotDueAt).toISOString() : undefined,
    }
  }

  if (action === 'create_bookmark') {
    return {
      url: getStringSlot(task, 'url'),
      title: title ?? task.title.trim(),
      summary:
        getStringSlot(task, 'summary') ??
        getStringSlot(task, 'note') ??
        getStringSlot(task, 'details') ??
        getStringSlot(task, 'content'),
    }
  }

  if (action === 'query_assets' || action === 'summarize_assets') {
    const timeRange = getStringSlot(task, 'timeRange')
    const todoStatus = getStringSlot(task, 'todoStatus')
    return {
      query: getStringSlot(task, 'query') ?? title,
      subjectHint: title,
      ...(timeRange && { timeRange: { type: timeRange as 'today' | 'recent' | 'this_week' | 'this_month' } }),
      ...(todoStatus && { status: todoStatus as 'open' | 'done' | 'all' }),
    }
  }

  const slotDueAt = getStringSlot(task, 'dueAt')

  return {
    selector: {
      query: getStringSlot(task, 'query') ?? title,
      subjectHint: title,
    },
    patch: {
      title: getStringSlot(task, 'title'),
      details: getStringSlot(task, 'details') ?? getStringSlot(task, 'content'),
      timeText: getStringSlot(task, 'timeText') ?? (isIsoDateTime(slotDueAt) ? undefined : slotDueAt),
      dueAt: isIsoDateTime(slotDueAt) ? slotDueAt : undefined,
      status: getStringSlot(task, 'status'),
    },
  }
}

function stepFromAction(input: {
  id: string
  action: Exclude<WorkspaceRunPlannerAction, 'update_todo'>
  target: 'notes' | 'todos' | 'bookmarks' | 'mixed'
  title?: string
  task: DraftWorkspaceTask
}): WorkspaceRunPlannerStep {
  const isMixedRead =
    input.target === 'mixed' && (input.action === 'query_assets' || input.action === 'summarize_assets')

  return {
    id: input.id,
    action: input.action,
    target: input.target,
    title: input.title,
    risk: isMixedRead ? 'high' : 'low',
    requiresUserApproval: isMixedRead,
    toolInput: buildToolInput(input.task, input.action, input.title),
  }
}

function resolveDefaultAction(task: DraftWorkspaceTask): {
  action: WorkspaceRunPlannerAction
  target: 'notes' | 'todos' | 'bookmarks'
} | null {
  if (task.intent === 'create' && task.target === 'notes') {
    return { action: 'create_note', target: 'notes' }
  }

  if (task.intent === 'create' && task.target === 'todos') {
    return { action: 'create_todo', target: 'todos' }
  }

  if (task.intent === 'create' && task.target === 'bookmarks') {
    return { action: 'create_bookmark', target: 'bookmarks' }
  }

  if (task.intent === 'query' && task.target !== 'mixed') {
    return { action: 'query_assets', target: task.target }
  }

  if (task.intent === 'summarize' && task.target !== 'mixed') {
    return { action: 'summarize_assets', target: task.target }
  }

  if (task.intent === 'update' && task.target === 'todos') {
    return { action: 'update_todo', target: 'todos' }
  }

  return null
}

function resolveHintTarget(action: WorkspaceRunPlannerAction, task: DraftWorkspaceTask) {
  if (action === 'create_note') {
    return 'notes' as const
  }

  if (action === 'create_todo' || action === 'update_todo') {
    return 'todos' as const
  }

  if (action === 'create_bookmark') {
    return 'bookmarks' as const
  }

  if (task.target !== 'mixed') {
    return task.target
  }

  if (action === 'query_assets' || action === 'summarize_assets') {
    return 'mixed' as const
  }

  return 'notes' as const
}

function isValidHintAction(value: unknown): value is WorkspaceRunPlannerAction {
  return (
    value === 'create_note' ||
    value === 'create_todo' ||
    value === 'create_bookmark' ||
    value === 'query_assets' ||
    value === 'summarize_assets' ||
    value === 'update_todo'
  )
}

async function buildUpdateStep(input: {
  id: string
  userId: string
  task: DraftWorkspaceTask
  title?: string
  query?: string
  searchCandidates: SearchWorkspaceRunCandidates
}): Promise<WorkspaceRunPlannerStep> {
  const query = input.query?.trim() || input.title?.trim() || ''
  let candidates: WorkspaceRunPlannerCandidate[] = []

  if (query.length > 0) {
    try {
      candidates = await input.searchCandidates({
        userId: input.userId,
        target: 'todos',
        query,
      })
    } catch {
      candidates = []
    }
  }

  return {
    id: input.id,
    action: 'update_todo',
    target: 'todos',
    title: input.title,
    risk: 'high',
    requiresUserApproval: true,
    candidates,
    toolInput: {
      ...buildToolInput(input.task, 'update_todo', input.title),
      selector: {
        id: candidates[0]?.id,
        query: query || undefined,
        subjectHint: input.title,
      },
    },
  }
}

async function buildPlanStep(input: {
  userId: string
  task: DraftWorkspaceTask
  searchCandidates: SearchWorkspaceRunCandidates
  runPlanHints: RunPlanHints
  stepIndex: number
}): Promise<WorkspaceRunPlannerStep> {
  const id = `step_${input.stepIndex + 1}`
  const hints = await resolveHints({
    task: input.task,
    runPlanHints: input.runPlanHints,
  })
  const resolved = hints && isValidHintAction(hints.action)
    ? {
        action: hints.action,
        target: resolveHintTarget(hints.action, input.task),
      }
    : resolveDefaultAction(input.task)

  const title = resolveTitle(input.task, hints)

  if (!resolved) {
    const resolvedAction: WorkspaceRunPlannerAction = input.task.intent === 'summarize' ? 'summarize_assets' : 'query_assets'
    return stepFromAction({
      id,
      action: resolvedAction,
      target: 'mixed',
      title,
      task: input.task,
    })
  }

  if (resolved.action === 'update_todo') {
    return buildUpdateStep({
      id,
      userId: input.userId,
      task: input.task,
      title,
      query: hints?.query?.trim() || input.task.slots.query?.trim() || title,
      searchCandidates: input.searchCandidates,
    })
  }

  return stepFromAction({
    id,
    action: resolved.action,
    target: resolved.target,
    title,
    task: input.task,
  })
}

export async function planWorkspaceRun(input: {
  userId: string
  draftTasks: DraftWorkspaceTask[]
  searchCandidates: SearchWorkspaceRunCandidates
  runPlanHints: RunPlanHints
}): Promise<WorkspaceRunPlannerResult> {
  const steps = await Promise.all(
    input.draftTasks.map((task, stepIndex) =>
      buildPlanStep({
        userId: input.userId,
        task,
        searchCandidates: input.searchCandidates,
        runPlanHints: input.runPlanHints,
        stepIndex,
      })
    )
  )

  return {
    summary: buildSummary(input.draftTasks.length),
    steps,
  }
}
