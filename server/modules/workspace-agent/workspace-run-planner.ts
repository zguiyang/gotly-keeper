import 'server-only'

import { renderPrompt } from '@/server/lib/prompt-template'

import type {
  DraftWorkspaceTask,
  WorkspacePatch,
  WorkspaceSelector,
} from '@/shared/workspace/workspace-run-protocol'

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
  selector?: WorkspaceSelector
  patch?: WorkspacePatch
  createPayload?: Record<string, unknown>
  /** Transitional bridge — built from selector/patch/createPayload */
  toolInput?: Record<string, unknown>
}

export type WorkspaceRunPlannerCandidate = {
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

// ── Shared Selector Builder ────────────────────────────────────────────
// All existing-object actions (query, summarize, update) share this path.

function buildSelector(task: DraftWorkspaceTask): WorkspaceSelector {
  const timeConstraint = buildTimeConstraint(task)
  const statusConstraint = buildStatusConstraint(task)
  const target = task.target as WorkspaceSelector['target']
  const subject = task.title.trim() || undefined
  const queryText = getStringSlot(task, 'query')
  const keywords = [subject, queryText].filter(Boolean) as string[]

  return {
    target,
    subject,
    keywords: keywords.length > 0 ? keywords : undefined,
    timeConstraint,
    statusConstraint,
    sort: timeConstraint?.kind === 'recent' ? 'recent_first' : 'relevance',
    limit: timeConstraint?.kind === 'recent' && timeConstraint.strength === 'strong' ? 3 : undefined,
  }
}

function buildTimeConstraint(task: DraftWorkspaceTask): WorkspaceSelector['timeConstraint'] {
  const timeRange = getStringSlot(task, 'timeRange')
  const timeText =
    getStringSlot(task, 'timeText') ??
    (timeRange ? undefined : getStringSlot(task, 'query')) ??
    (timeRange ? undefined : task.title.trim() || undefined)

  if (!timeRange) {
    return timeText ? parseRelativeWindow(timeText) : null
  }

  if (timeRange === 'recent') {
    return { kind: 'recent', strength: 'soft' }
  }

  if (timeRange === 'today' || timeRange === 'yesterday') {
    return { kind: 'named_range', name: timeRange, strength: 'hard' }
  }

  if (timeRange === 'this_week' || timeRange === 'this_month') {
    return { kind: 'named_range', name: timeRange, strength: 'hard' }
  }

  return timeText ? parseRelativeWindow(timeText) : null
}

function buildStatusConstraint(task: DraftWorkspaceTask): WorkspaceSelector['statusConstraint'] {
  const status = getStringSlot(task, 'todoStatus')
  if (status === 'open' || status === 'done' || status === 'all') return status
  return null
}

// ── Tool Input Builder (transitional bridge) ──────────────────────────
// Kept for backward compatibility with workspace-run-executor.
// Built on top of selector/patch/createPayload semantics.

function buildSearchToolInput(selector: WorkspaceSelector, slotQuery?: string): Record<string, unknown> {
  // Prefer the explicit query slot. Fall back to subject, then keywords.
  const query = slotQuery ?? selector.subject ?? selector.keywords?.[0] ?? null
  return {
    selector,
    query,
    subjectHint: selector.subject ?? null,
    timeRange: selector.timeConstraint ? mapTimeConstraintToTimeRange(selector.timeConstraint) : undefined,
    limit: selector.limit ?? 10,
    recentFocus: selector.timeConstraint?.kind === 'recent',
  }
}

function buildPatchToolInput(
  task: DraftWorkspaceTask,
  selector: WorkspaceSelector,
  title?: string
): { selector: Record<string, unknown>; semanticSelector: WorkspaceSelector; patch: Record<string, unknown> } {
  const query = getStringSlot(task, 'query') ?? title
  const slotDueAt = getStringSlot(task, 'dueAt')
  return {
    selector: {
      query,
      subjectHint: title,
    },
    semanticSelector: selector,
    patch: {
      title: getStringSlot(task, 'title'),
      details: getStringSlot(task, 'details') ?? getStringSlot(task, 'content'),
      timeText: getStringSlot(task, 'timeText') ?? (isIsoDateTime(slotDueAt) ? undefined : slotDueAt),
      dueAt: isIsoDateTime(slotDueAt) ? slotDueAt : undefined,
      status: getStringSlot(task, 'status'),
    },
  }
}

function mapTimeConstraintToTimeRange(tc: NonNullable<WorkspaceSelector['timeConstraint']>): Record<string, unknown> | undefined {
  if (tc.kind === 'named_range') {
    if (tc.name === 'yesterday') {
      return undefined
    }
    return { type: tc.name as 'today' | 'this_week' | 'this_month' }
  }
  if (tc.kind === 'recent') {
    return { type: 'recent' }
  }
  return undefined
}

function parseRelativeWindow(rawText: string): WorkspaceSelector['timeConstraint'] {
  const text = rawText.trim()
  if (!text) {
    return null
  }

  const normalized = text.replace(/\s+/g, '')

  if (/^(刚刚|刚才|最近|近期|前面|之前)/.test(normalized)) {
    return {
      kind: 'recent',
      strength: /^(刚刚|刚才)/.test(normalized) ? 'strong' : 'soft',
    }
  }

  const namedRangeMap: Record<string, 'today' | 'yesterday' | 'this_week' | 'this_month'> = {
    今天: 'today',
    今日: 'today',
    昨天: 'yesterday',
    昨日: 'yesterday',
    这周: 'this_week',
    本周: 'this_week',
    这个月: 'this_month',
    本月: 'this_month',
  }

  for (const [phrase, name] of Object.entries(namedRangeMap)) {
    if (normalized.includes(phrase)) {
      return {
        kind: 'named_range',
        name,
        strength: 'hard',
      }
    }
  }

  const match = normalized.match(/(?:(过去|最近|近))?([一二两三四五六七八九十百半\d]+)(分钟|小时|天|周|个月|月)(内|以来)?/)
  if (!match) {
    return null
  }

  const value = parseRelativeNumber(match[2])
  if (!value) {
    return null
  }

  const unitMap: Record<string, 'minute' | 'hour' | 'day' | 'week' | 'month'> = {
    分钟: 'minute',
    小时: 'hour',
    天: 'day',
    周: 'week',
    月: 'month',
    个月: 'month',
  }

  const unit = unitMap[match[3]]
  if (!unit) {
    return null
  }

  return {
    kind: 'relative_window',
    anchor: 'now',
    direction: 'past',
    unit,
    value,
    strength: 'hard',
  }
}

function parseRelativeNumber(rawValue: string): number | null {
  if (/^\d+$/.test(rawValue)) {
    return Number(rawValue)
  }

  if (rawValue === '半') {
    return 0.5
  }

  const digitMap: Record<string, number> = {
    一: 1,
    二: 2,
    两: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    七: 7,
    八: 8,
    九: 9,
  }

  if (rawValue === '十') {
    return 10
  }

  const tensMatch = rawValue.match(/^(十)([一二两三四五六七八九])?$/)
  if (tensMatch) {
    return 10 + (tensMatch[2] ? digitMap[tensMatch[2]] : 0)
  }

  const compoundMatch = rawValue.match(/^([一二两三四五六七八九])十([一二两三四五六七八九])?$/)
  if (compoundMatch) {
    return digitMap[compoundMatch[1]] * 10 + (compoundMatch[2] ? digitMap[compoundMatch[2]] : 0)
  }

  return digitMap[rawValue] ?? null
}

// ── Legacy helpers (transitional) ─────────────────────────────────────

function buildSummary(taskCount: number) {
  return `准备执行 ${taskCount} 个任务。`
}

function shouldUseHints(task: DraftWorkspaceTask) {
  const hasUrl = typeof task.slots.url === 'string' && task.slots.url.trim().length > 0
  if (task.intent === 'create' && task.target === 'bookmarks' && hasUrl) {
    return false
  }

  if (
    task.intent === 'create' &&
    (task.target === 'notes' || task.target === 'todos')
  ) {
    return false
  }

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
  const cleanTitle = task.cleanTitle?.trim()
  if (cleanTitle) {
    return cleanTitle
  }
  const taskTitle = task.title.trim()
  return taskTitle.length > 0 ? taskTitle : undefined
}

function resolveCleanContent(task: DraftWorkspaceTask) {
  const cleanContent = task.cleanContent?.trim()
  return cleanContent && cleanContent.length > 0 ? cleanContent : undefined
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
  if (!value) return false
  return !Number.isNaN(Date.parse(value)) && value.includes('T')
}

// ── Create-payload builders (unchanged behavior) ──────────────────────

function buildCreateToolInput(task: DraftWorkspaceTask, action: WorkspaceRunPlannerAction, title?: string): Record<string, unknown> {
  if (action === 'create_note') {
    const cleanContent = resolveCleanContent(task)
    return {
      content: cleanContent ?? title ?? getStringSlot(task, 'content') ?? task.title.trim(),
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
    const cleanContent = resolveCleanContent(task)
    return {
      url: getStringSlot(task, 'url'),
      title: title ?? task.title.trim(),
      note: cleanContent ?? getStringSlot(task, 'note') ?? getStringSlot(task, 'details') ?? getStringSlot(task, 'content'),
      summary: getStringSlot(task, 'summary'),
    }
  }

  return {}
}

// ── Step Builders ─────────────────────────────────────────────────────

function assessReadRisk(task: DraftWorkspaceTask, target: string): { risk: 'low' | 'medium' | 'high'; requiresUserApproval: boolean } {
  if (target !== 'mixed') {
    return { risk: 'low', requiresUserApproval: false }
  }

  const title = task.title.trim()
  const slotQuery = getStringSlot(task, 'query')
  const hasClearSubject = title.length > 0 || (slotQuery !== undefined && slotQuery.length > 0)
  const hasHighConfidence = task.confidence >= 0.7

  if (hasClearSubject && hasHighConfidence) {
    return { risk: 'low', requiresUserApproval: false }
  }

  return { risk: 'high', requiresUserApproval: true }
}

function buildReadStep(input: {
  id: string
  action: 'query_assets' | 'summarize_assets'
  target: 'notes' | 'todos' | 'bookmarks' | 'mixed'
  title?: string
  task: DraftWorkspaceTask
}): WorkspaceRunPlannerStep {
  const selector = buildSelector(input.task)
  const slotQuery = getStringSlot(input.task, 'query')
  const { risk, requiresUserApproval } = assessReadRisk(input.task, input.target)

  return {
    id: input.id,
    action: input.action,
    target: input.target,
    title: input.title,
    risk,
    requiresUserApproval,
    selector,
    toolInput: buildSearchToolInput(selector, slotQuery),
  }
}

function buildCreateStep(input: {
  id: string
  action: 'create_note' | 'create_todo' | 'create_bookmark'
  target: 'notes' | 'todos' | 'bookmarks'
  title?: string
  task: DraftWorkspaceTask
}): WorkspaceRunPlannerStep {
  const createPayload = buildCreateToolInput(input.task, input.action, input.title)

  return {
    id: input.id,
    action: input.action,
    target: input.target,
    title: input.title,
    risk: 'low',
    requiresUserApproval: false,
    createPayload,
    toolInput: createPayload,
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
  if (action === 'create_note') return 'notes' as const
  if (action === 'create_todo' || action === 'update_todo') return 'todos' as const
  if (action === 'create_bookmark') return 'bookmarks' as const
  if (task.target !== 'mixed') return task.target
  if (action === 'query_assets' || action === 'summarize_assets') return 'mixed' as const
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
  const selector = buildSelector(input.task)
  const query = input.query?.trim() || selector.subject?.trim() || ''

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

  const patch: WorkspacePatch = {
    title: getStringSlot(input.task, 'title'),
    details: getStringSlot(input.task, 'details') ?? getStringSlot(input.task, 'content'),
    dueAt: isIsoDateTime(getStringSlot(input.task, 'dueAt')) ? getStringSlot(input.task, 'dueAt') : undefined,
    status: (getStringSlot(input.task, 'status') ?? getStringSlot(input.task, 'todoStatus')) as 'open' | 'done' | undefined,
  }
  const statusSlot = getStringSlot(input.task, 'status') as 'open' | 'done' | undefined
  if (statusSlot) patch.status = statusSlot

  const toolInput = buildPatchToolInput(input.task, selector, input.title)

  return {
    id: input.id,
    action: 'update_todo',
    target: 'todos',
    title: input.title,
    risk: 'high',
    requiresUserApproval: true,
    candidates,
    selector,
    patch,
    toolInput: {
      ...toolInput,
      selector: {
        ...toolInput.selector,
        id: candidates[0]?.id,
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
  const hints = await resolveHints({ task: input.task, runPlanHints: input.runPlanHints })
  const resolved = hints && isValidHintAction(hints.action)
    ? {
        action: hints.action,
        target: resolveHintTarget(hints.action, input.task),
      }
    : resolveDefaultAction(input.task)

  const title = resolveTitle(input.task, hints)

  if (!resolved) {
    const resolvedAction: WorkspaceRunPlannerAction = input.task.intent === 'summarize' ? 'summarize_assets' : 'query_assets'
    return buildReadStep({
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

  if (
    resolved.action === 'create_note' ||
    resolved.action === 'create_todo' ||
    resolved.action === 'create_bookmark'
  ) {
    return buildCreateStep({
      id,
      action: resolved.action,
      target: resolved.target as 'notes' | 'todos' | 'bookmarks',
      title,
      task: input.task,
    })
  }

  return buildReadStep({
    id,
    action: resolved.action as 'query_assets' | 'summarize_assets',
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
