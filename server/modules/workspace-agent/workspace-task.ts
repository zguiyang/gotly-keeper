import 'server-only'

import { z } from 'zod'

import type { WorkspaceTask, WorkspaceTarget } from './types'

const workspaceIntentSchema = z.enum(['query', 'summarize', 'create', 'update'])
const workspaceTargetSchema = z.enum(['notes', 'todos', 'bookmarks'])
const workspaceTimeRangeTypeSchema = z.enum(['today', 'recent', 'this_week', 'this_month', 'custom'])

function normalizeNullableString(value: unknown) {
  if (typeof value !== 'string') {
    return value
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function normalizeNullableIsoString(value: unknown) {
  const normalized = normalizeNullableString(value)
  return normalized
}

function normalizeTarget(value: unknown): WorkspaceTarget | null | undefined {
  if (typeof value !== 'string') {
    return value as WorkspaceTarget | null | undefined
  }

  const normalized = value.trim().toLowerCase()

  if (normalized.length === 0) {
    return null
  }

  if (normalized === 'link' || normalized === 'links' || normalized === 'bookmark') {
    return 'bookmarks'
  }

  if (normalized === 'note') {
    return 'notes'
  }

  if (normalized === 'todo') {
    return 'todos'
  }

  return normalized as WorkspaceTarget
}

function normalizePayload(value: unknown) {
  if (value === undefined) {
    return undefined
  }

  if (value === null) {
    return null
  }

  if (typeof value !== 'object' || Array.isArray(value)) {
    return value
  }

  const entries = Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
  return entries.length > 0 ? Object.fromEntries(entries) : null
}

const workspaceTimeRangeSchema = z.object({
  type: workspaceTimeRangeTypeSchema,
  startAt: z.string().datetime().nullable().optional(),
  endAt: z.string().datetime().nullable().optional(),
})

const workspaceTaskShapeSchema = z.object({
  intent: workspaceIntentSchema,
  target: workspaceTargetSchema.nullable().optional(),
  timeRange: workspaceTimeRangeSchema.nullable().optional(),
  query: z.string().min(1).nullable().optional(),
  subjectHint: z.string().min(1).nullable().optional(),
  payload: z.record(z.string(), z.unknown()).nullable().optional(),
})

export const workspaceTaskSchema = z.preprocess((input) => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return input
  }

  const raw = input as Record<string, unknown>
  const hasPayload = Object.prototype.hasOwnProperty.call(raw, 'payload')
  const hasTimeRange = Object.prototype.hasOwnProperty.call(raw, 'timeRange')
  const normalizedTimeRange =
    raw.timeRange && typeof raw.timeRange === 'object' && !Array.isArray(raw.timeRange)
      ? {
          ...raw.timeRange,
          startAt: normalizeNullableIsoString((raw.timeRange as Record<string, unknown>).startAt),
          endAt: normalizeNullableIsoString((raw.timeRange as Record<string, unknown>).endAt),
        }
      : raw.timeRange

  return {
    ...raw,
    target: normalizeTarget(raw.target),
    query: normalizeNullableString(raw.query),
    subjectHint: normalizeNullableString(raw.subjectHint),
    payload: hasPayload ? normalizePayload(raw.payload) : undefined,
    timeRange: hasTimeRange ? normalizedTimeRange : undefined,
  }
}, workspaceTaskShapeSchema)

export class WorkspaceTaskValidationError extends Error {
  readonly issues: string[]

  constructor(message: string, issues: string[]) {
    super(issues.length > 0 ? `${message} ${issues.join('; ')}` : message)
    this.name = 'WorkspaceTaskValidationError'
    this.issues = issues
  }
}

function toIssueMessages(error: z.ZodError) {
  return error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join('.') : 'task'
    return `${path}: ${issue.message}`
  })
}

function stripUndefinedValues<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((entry) => stripUndefinedValues(entry)) as T
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
    return Object.fromEntries(
      entries.map(([key, entryValue]) => [key, stripUndefinedValues(entryValue)])
    ) as T
  }

  return value
}

function applyBusinessRules(task: WorkspaceTask) {
  const issues: string[] = []

  if ((task.intent === 'create' || task.intent === 'update') && !task.payload) {
    issues.push('payload is required for create and update tasks')
  }

  if (task.intent === 'update' && task.target !== 'todos') {
    issues.push('update currently only supports todos')
  }

  if (
    task.timeRange?.type === 'custom' &&
    !task.timeRange.startAt &&
    !task.timeRange.endAt
  ) {
    issues.push('timeRange.custom requires startAt or endAt')
  }

  if (issues.length > 0) {
    throw new WorkspaceTaskValidationError('Invalid workspace task business rules.', issues)
  }

  return task
}

export function normalizeWorkspaceTask(input: unknown): WorkspaceTask {
  const parsed = workspaceTaskSchema.safeParse(input)

  if (!parsed.success) {
    throw new WorkspaceTaskValidationError(
      'Invalid workspace task payload.',
      toIssueMessages(parsed.error)
    )
  }

  return stripUndefinedValues(parsed.data)
}

export function validateWorkspaceTask(input: unknown): WorkspaceTask {
  const task = normalizeWorkspaceTask(input)
  return applyBusinessRules(task)
}
