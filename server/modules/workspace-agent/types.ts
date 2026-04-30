import type { ZodType } from 'zod'

export type WorkspaceIntent = 'query' | 'summarize' | 'create' | 'update'

export type WorkspaceTarget = 'notes' | 'todos' | 'bookmarks' | 'mixed'

export type WorkspaceTimeRangeType = 'today' | 'recent' | 'this_week' | 'this_month' | 'custom'

export type WorkspaceTask = {
  intent: WorkspaceIntent
  target?: Exclude<WorkspaceTarget, 'mixed'> | null
  timeRange?: {
    type: WorkspaceTimeRangeType
    startAt?: string | null
    endAt?: string | null
  } | null
  query?: string | null
  subjectHint?: string | null
  payload?: Record<string, unknown> | null
}

export type WorkspaceExecutionPlan = {
  intent: WorkspaceIntent
  target: WorkspaceTarget
  toolName: string
  toolInput: Record<string, unknown>
  needsCompose: boolean
}

export type WorkspaceToolResult =
  | {
      ok: true
      target: Exclude<WorkspaceTarget, 'mixed'> | 'mixed'
      items?: unknown[]
      total?: number
      action?: 'create' | 'update'
      item?: unknown
    }
  | {
      ok: false
      code: string
      message: string
    }

export type WorkspaceToolContext = {
  userId: string
}

export type WorkspaceTool<Input = Record<string, unknown>, Output = WorkspaceToolResult> = {
  name: string
  inputSchema: ZodType<Input>
  execute: (input: Input, context: WorkspaceToolContext) => Promise<Output>
}
