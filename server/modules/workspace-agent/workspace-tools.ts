import 'server-only'

import { z } from 'zod'

import { matchesSearchTimeHint } from '@/server/services/search/search.time-match'
import {
  createWorkspaceLink,
  createWorkspaceNote,
  createWorkspaceTodo,
  listWorkspaceAssets,
  searchWorkspaceAssets,
  setWorkspaceTodoCompletion,
  updateWorkspaceTodo,
} from '@/server/modules/workspace'
import { ASIA_SHANGHAI_TIME_ZONE, dayjs } from '@/shared/time/dayjs'
import { type WorkspaceAgentTimeFilter } from '@/shared/workspace/workspace-run.types'

import type { AssetListItem } from '@/shared/assets/assets.types'
import type { WorkspaceTool, WorkspaceToolContext, WorkspaceToolResult } from './types'

const timeRangeSchema = z
  .object({
    type: z.enum(['today', 'recent', 'this_week', 'this_month', 'custom']),
    startAt: z.string().datetime().nullable().optional(),
    endAt: z.string().datetime().nullable().optional(),
  })
  .nullable()
  .optional()

const searchInputSchema = z.object({
  query: z.string().nullable().optional(),
  subjectHint: z.string().nullable().optional(),
  timeRange: timeRangeSchema,
  limit: z.number().int().min(1).max(20).default(10),
})

const searchTodosInputSchema = searchInputSchema.extend({
  status: z.enum(['open', 'done', 'all']).default('all'),
})

const getRecentItemsInputSchema = z.object({
  targets: z.array(z.enum(['notes', 'todos', 'bookmarks'])).min(1).max(3),
  timeRange: z
    .object({
      type: z.enum(['today', 'recent', 'this_week', 'this_month']),
    })
    .default({ type: 'recent' }),
  limitPerTarget: z.number().int().min(1).max(10).default(5),
})

const createNoteInputSchema = z.object({
  content: z.string().trim().min(1),
})

const createTodoInputSchema = z.object({
  title: z.string().trim().min(1).max(120),
  details: z.string().trim().nullable().optional(),
  timeText: z.string().trim().nullable().optional(),
  dueAt: z.string().datetime().nullable().optional(),
})

const createBookmarkInputSchema = z.object({
  url: z.url(),
  title: z.string().trim().min(1).max(200).nullable().optional(),
  summary: z.string().trim().nullable().optional(),
})

const updateTodoInputSchema = z.object({
  selector: z.object({
    id: z.string().min(1).nullable().optional(),
    query: z.string().trim().min(1).nullable().optional(),
    subjectHint: z.string().trim().min(1).nullable().optional(),
  }),
  patch: z.object({
    title: z.string().trim().min(1).max(120).nullable().optional(),
    details: z.string().trim().nullable().optional(),
    timeText: z.string().trim().nullable().optional(),
    dueAt: z.string().datetime().nullable().optional(),
    status: z.enum(['open', 'done']).nullable().optional(),
  }),
})

type WorkspaceToolTimeRange = z.infer<typeof timeRangeSchema>

function buildLookupQuery(query: string | null | undefined, subjectHint: string | null | undefined) {
  const combined = [query?.trim(), subjectHint?.trim()].filter(Boolean).join(' ').trim()
  return combined.length > 0 ? combined : null
}

function buildBookmarkRawInput(input: {
  title?: string | null
  summary?: string | null
  url: string
}) {
  return [input.title?.trim(), input.summary?.trim(), input.url.trim()].filter(Boolean).join('\n\n')
}

function toExactRangeTimeFilter(input: {
  phrase: string
  startsAt: Date
  endsAt: Date
  basis: string
}): WorkspaceAgentTimeFilter {
  return {
    kind: 'exact_range',
    phrase: input.phrase,
    startIso: input.startsAt.toISOString(),
    endIso: input.endsAt.toISOString(),
    basis: input.basis,
  }
}

function getCurrentShanghaiTime() {
  return dayjs().tz(ASIA_SHANGHAI_TIME_ZONE)
}

function buildTimeFilter(timeRange: WorkspaceToolTimeRange): WorkspaceAgentTimeFilter | null {
  if (!timeRange || timeRange.type === 'recent') {
    return null
  }

  if (timeRange.type === 'custom') {
    if (!timeRange.startAt && !timeRange.endAt) {
      return null
    }

    const startsAt = timeRange.startAt ? new Date(timeRange.startAt) : new Date(0)
    const endsAt = timeRange.endAt ? new Date(timeRange.endAt) : new Date('9999-12-31T23:59:59.999Z')
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || startsAt >= endsAt) {
      return null
    }

    return toExactRangeTimeFilter({
      phrase: 'custom',
      startsAt,
      endsAt,
      basis: 'workspace-tool-custom-range',
    })
  }

  const current = getCurrentShanghaiTime()

  if (timeRange.type === 'today') {
    return toExactRangeTimeFilter({
      phrase: 'today',
      startsAt: current.startOf('day').toDate(),
      endsAt: current.add(1, 'day').startOf('day').toDate(),
      basis: 'workspace-tool-today',
    })
  }

  if (timeRange.type === 'this_month') {
    return toExactRangeTimeFilter({
      phrase: 'this_month',
      startsAt: current.startOf('month').toDate(),
      endsAt: current.add(1, 'month').startOf('month').toDate(),
      basis: 'workspace-tool-this-month',
    })
  }

  const weekday = current.day()
  const daysFromMonday = weekday === 0 ? 6 : weekday - 1
  const startOfWeek = current.startOf('day').subtract(daysFromMonday, 'day')

  return toExactRangeTimeFilter({
    phrase: 'this_week',
    startsAt: startOfWeek.toDate(),
    endsAt: startOfWeek.add(1, 'week').toDate(),
    basis: 'workspace-tool-this-week',
  })
}

function filterItemsByTimeRange(items: AssetListItem[], timeRange: WorkspaceToolTimeRange): AssetListItem[] {
  const timeFilter = buildTimeFilter(timeRange)
  if (!timeFilter || timeFilter.kind !== 'exact_range') {
    return items
  }

  const startsAt = new Date(timeFilter.startIso)
  const endsAt = new Date(timeFilter.endIso)
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || startsAt >= endsAt) {
    return items
  }

  return items.filter((item) =>
    matchesSearchTimeHint(item as never, { startsAt, endsAt }, timeFilter.phrase)
  )
}

function toQueryResult(
  target: 'notes' | 'todos' | 'bookmarks' | 'mixed',
  items: unknown[]
): WorkspaceToolResult {
  return {
    ok: true,
    target,
    items,
    total: items.length,
  }
}

function toMutationResult(
  target: 'notes' | 'todos' | 'bookmarks',
  action: 'create' | 'update',
  item: unknown
): WorkspaceToolResult {
  return {
    ok: true,
    target,
    action,
    item,
  }
}

async function searchAssetsByType(input: {
  userId: string
  typeHint: 'note' | 'todo' | 'link'
  query?: string | null
  subjectHint?: string | null
  timeRange?: WorkspaceToolTimeRange
  limit?: number
}): Promise<AssetListItem[]> {
  const combinedQuery = buildLookupQuery(input.query, input.subjectHint)
  const timeFilter = buildTimeFilter(input.timeRange)

  if (combinedQuery) {
    return searchWorkspaceAssets({
      userId: input.userId,
      query: combinedQuery,
      timeFilter,
      typeHint: input.typeHint,
    })
  }

  const items = await listWorkspaceAssets({
    userId: input.userId,
    type: input.typeHint,
    limit: timeFilter ? Math.max(input.limit ?? 10, 100) : input.limit,
  })

  return filterItemsByTimeRange(items, input.timeRange).slice(0, input.limit)
}

async function resolveTodoId(input: {
  userId: string
  selector: {
    id?: string | null
    query?: string | null
    subjectHint?: string | null
  }
}) {
  if (input.selector.id) {
    return input.selector.id
  }

  const combinedQuery = buildLookupQuery(input.selector.query, input.selector.subjectHint)
  if (!combinedQuery) {
    throw new Error('update_todo requires selector.id, selector.query, or selector.subjectHint')
  }

  const matches = await searchWorkspaceAssets({
    userId: input.userId,
    query: combinedQuery,
    typeHint: 'todo',
  })

  const firstMatch = matches.find((item) => item.type === 'todo')
  if (!firstMatch) {
    throw new Error('No matching todo found for update.')
  }

  return firstMatch.id
}

export const workspaceTools = {
  search_notes: {
    name: 'search_notes',
    inputSchema: searchInputSchema,
    async execute(input, context) {
      const items = await searchAssetsByType({
        userId: context.userId,
        typeHint: 'note',
        query: input.query,
        subjectHint: input.subjectHint,
        timeRange: input.timeRange,
        limit: input.limit,
      })

      return toQueryResult('notes', items)
    },
  } satisfies WorkspaceTool<z.infer<typeof searchInputSchema>>,
  search_all: {
    name: 'search_all',
    inputSchema: searchInputSchema,
    async execute(input, context) {
      const combinedQuery = buildLookupQuery(input.query, input.subjectHint)

      const items = combinedQuery
        ? await searchWorkspaceAssets({
            userId: context.userId,
            query: combinedQuery,
            timeFilter: buildTimeFilter(input.timeRange),
            typeHint: null,
          })
        : await listWorkspaceAssets({
            userId: context.userId,
            limit: buildTimeFilter(input.timeRange) ? Math.max(input.limit, 100) : input.limit,
          })

      return toQueryResult(
        'mixed',
        combinedQuery ? items : filterItemsByTimeRange(items, input.timeRange).slice(0, input.limit)
      )
    },
  } satisfies WorkspaceTool<z.infer<typeof searchInputSchema>>,
  search_todos: {
    name: 'search_todos',
    inputSchema: searchTodosInputSchema,
    async execute(input, context) {
      const items = await searchAssetsByType({
        userId: context.userId,
        typeHint: 'todo',
        query: input.query,
        subjectHint: input.subjectHint,
        timeRange: input.timeRange,
        limit: input.limit,
      })

      const filteredItems =
        input.status === 'all'
          ? items
          : items.filter(
              (item) =>
                item.type === 'todo' &&
                (input.status === 'done' ? item.completed === true : item.completed !== true)
            )

      return toQueryResult('todos', filteredItems)
    },
  } satisfies WorkspaceTool<z.infer<typeof searchTodosInputSchema>>,
  search_bookmarks: {
    name: 'search_bookmarks',
    inputSchema: searchInputSchema,
    async execute(input, context) {
      const items = await searchAssetsByType({
        userId: context.userId,
        typeHint: 'link',
        query: input.query,
        subjectHint: input.subjectHint,
        timeRange: input.timeRange,
        limit: input.limit,
      })

      return toQueryResult('bookmarks', items)
    },
  } satisfies WorkspaceTool<z.infer<typeof searchInputSchema>>,
  get_recent_items: {
    name: 'get_recent_items',
    inputSchema: getRecentItemsInputSchema,
    async execute(input, context) {
      const targetMap = {
        notes: 'note',
        todos: 'todo',
        bookmarks: 'link',
      } as const

      const groups = await Promise.all(
        input.targets.map(async (target) =>
          listWorkspaceAssets({
            userId: context.userId,
            type: targetMap[target],
            limit: buildTimeFilter(input.timeRange) ? Math.max(input.limitPerTarget, 50) : input.limitPerTarget,
          })
        )
      )

      const items = groups.flat() as AssetListItem[]
      items.sort((left, right) => {
        const leftTimestamp =
          left && typeof left === 'object' && 'createdAt' in left && left.createdAt instanceof Date
            ? left.createdAt.getTime()
            : 0
        const rightTimestamp =
          right &&
          typeof right === 'object' &&
          'createdAt' in right &&
          right.createdAt instanceof Date
            ? right.createdAt.getTime()
            : 0
        return rightTimestamp - leftTimestamp
      })

      return toQueryResult('mixed', filterItemsByTimeRange(items, input.timeRange).slice(0, input.limitPerTarget * input.targets.length))
    },
  } satisfies WorkspaceTool<z.infer<typeof getRecentItemsInputSchema>>,
  create_note: {
    name: 'create_note',
    inputSchema: createNoteInputSchema,
    async execute(input, context) {
      const result = await createWorkspaceNote({
        userId: context.userId,
        rawInput: input.content,
        content: input.content,
      })

      return toMutationResult('notes', 'create', result.asset)
    },
  } satisfies WorkspaceTool<z.infer<typeof createNoteInputSchema>>,
  create_todo: {
    name: 'create_todo',
    inputSchema: createTodoInputSchema,
    async execute(input, context) {
      const result = await createWorkspaceTodo({
        userId: context.userId,
        rawInput: input.title,
        title: input.title,
        content: input.details ?? null,
        timeText: input.timeText ?? null,
        dueAt: input.dueAt ? new Date(input.dueAt) : null,
      })

      return toMutationResult('todos', 'create', result.asset)
    },
  } satisfies WorkspaceTool<z.infer<typeof createTodoInputSchema>>,
  create_bookmark: {
    name: 'create_bookmark',
    inputSchema: createBookmarkInputSchema,
    async execute(input, context) {
      const result = await createWorkspaceLink({
        userId: context.userId,
        rawInput: buildBookmarkRawInput(input),
        url: input.url,
        title: input.title ?? null,
        note: null,
        summary: input.summary ?? null,
      })

      return toMutationResult('bookmarks', 'create', result.asset)
    },
  } satisfies WorkspaceTool<z.infer<typeof createBookmarkInputSchema>>,
  update_todo: {
    name: 'update_todo',
    inputSchema: updateTodoInputSchema,
    async execute(input, context) {
      const todoId = await resolveTodoId({
        userId: context.userId,
        selector: input.selector,
      })

      let updatedTodo: unknown = null

      const hasFieldPatch =
        input.patch.title !== undefined ||
        input.patch.details !== undefined ||
        input.patch.timeText !== undefined ||
        input.patch.dueAt !== undefined

      if (hasFieldPatch) {
        updatedTodo = await updateWorkspaceTodo({
          userId: context.userId,
          assetId: todoId,
          rawInput: input.patch.title ?? input.selector.subjectHint ?? input.selector.query ?? '更新待办',
          title: input.patch.title ?? null,
          content: input.patch.details ?? null,
          timeText: input.patch.timeText ?? null,
          dueAt: input.patch.dueAt ? new Date(input.patch.dueAt) : null,
        })
      }

      if (input.patch.status) {
        updatedTodo = await setWorkspaceTodoCompletion({
          userId: context.userId,
          assetId: todoId,
          completed: input.patch.status === 'done',
        })
      }

      if (!updatedTodo) {
        throw new Error('update_todo requires at least one patch field.')
      }

      return toMutationResult('todos', 'update', updatedTodo)
    },
  } satisfies WorkspaceTool<z.infer<typeof updateTodoInputSchema>>,
}

export async function executeWorkspaceTool(
  plan: {
    toolName: keyof typeof workspaceTools
    toolInput: Record<string, unknown>
  },
  context: WorkspaceToolContext
) {
  const tool = workspaceTools[plan.toolName] as unknown as WorkspaceTool<Record<string, unknown>>
  if (!tool) {
    throw new Error(`Unknown workspace tool: ${plan.toolName}`)
  }

  const parsedInput = tool.inputSchema.parse(plan.toolInput)
  return tool.execute(parsedInput, context)
}
