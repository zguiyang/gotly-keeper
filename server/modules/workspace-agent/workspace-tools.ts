import 'server-only'

import { z } from 'zod'

import { normalizeSearchText } from '@/server/services/search/search.query-parser'
import { matchesSearchTimeHint } from '@/server/services/search/search.time-match'
import {
  createWorkspaceLinkAsset,
  createWorkspaceNoteAsset,
  createWorkspaceTodoAsset,
  listWorkspaceAssets,
  searchWorkspaceAssets,
  setWorkspaceTodoAssetCompletion,
  updateWorkspaceTodoAsset,
} from '@/server/services/workspace/workspace-assets.service'
import { ASIA_SHANGHAI_TIME_ZONE, dayjs } from '@/shared/time/dayjs'
import { type WorkspaceAgentTimeFilter, timeConstraintToFilter } from '@/shared/workspace/workspace-run.types'

import type { WorkspaceTool, WorkspaceToolContext, WorkspaceToolResult } from './types'
import type { AssetListItem } from '@/shared/assets/assets.types'
import type { WorkspaceSelector, WorkspaceTimeConstraint } from '@/shared/workspace/workspace-run-protocol'

const workspaceTimeConstraintSchema: z.ZodType<WorkspaceTimeConstraint> = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('recent'),
    strength: z.enum(['soft', 'strong']),
  }),
  z.object({
    kind: z.literal('relative_window'),
    anchor: z.literal('now'),
    direction: z.literal('past'),
    unit: z.enum(['minute', 'hour', 'day', 'week', 'month']),
    value: z.number().positive(),
    strength: z.literal('hard'),
  }),
  z.object({
    kind: z.literal('named_range'),
    name: z.enum(['today', 'yesterday', 'this_week', 'this_month']),
    strength: z.literal('hard'),
  }),
  z.object({
    kind: z.literal('exact_range'),
    startAt: z.string().datetime().optional(),
    endAt: z.string().datetime().optional(),
    strength: z.literal('hard'),
  }),
])

const workspaceSelectorSchema: z.ZodType<WorkspaceSelector> = z.object({
  target: z.enum(['notes', 'todos', 'bookmarks', 'mixed']),
  subject: z.string().trim().min(1).optional(),
  keywords: z.array(z.string().trim().min(1)).optional(),
  timeConstraint: workspaceTimeConstraintSchema.nullable().optional(),
  statusConstraint: z.enum(['open', 'done', 'all']).nullable().optional(),
  sort: z.enum(['relevance', 'recent_first']).optional(),
  limit: z.number().int().min(1).max(20).optional(),
})

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
  recentFocus: z.boolean().default(false),
  selector: workspaceSelectorSchema.optional(),
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
  note: z.string().trim().nullable().optional(),
  summary: z.string().trim().nullable().optional(),
})

const updateTodoInputSchema = z.object({
  selector: z.object({
    id: z.string().min(1).nullable().optional(),
    query: z.string().trim().min(1).nullable().optional(),
    subjectHint: z.string().trim().min(1).nullable().optional(),
  }),
  semanticSelector: workspaceSelectorSchema.optional(),
  patch: z.object({
    title: z.string().trim().min(1).max(120).nullable().optional(),
    details: z.string().trim().nullable().optional(),
    timeText: z.string().trim().nullable().optional(),
    dueAt: z.string().datetime().nullable().optional(),
    status: z.enum(['open', 'done']).nullable().optional(),
  }),
})

type WorkspaceToolTimeRange = z.infer<typeof timeRangeSchema>

// ── Shared Resolution Path ────────────────────────────────────────────
// All existing-object operations (query, summarize, update) route through
// this path. It consumes structured selector semantics.

export type ResolutionMode = 'none' | 'single' | 'multiple'

export type WorkspaceTargetResolution = {
  mode: ResolutionMode
  items: AssetListItem[]
  total: number
}

export async function resolveWorkspaceTargets(
  selector: WorkspaceSelector,
  context: WorkspaceToolContext
): Promise<WorkspaceTargetResolution> {
  const timeFilter = buildTimeFilterFromConstraint(selector.timeConstraint)
  const combinedQuery = buildSelectorQuery(selector)
  const limit = selector.limit ?? 10
  const preferRecent = selector.timeConstraint?.kind === 'recent' || selector.sort === 'recent_first' ? true : undefined
  const typeHint = selector.target === 'mixed' ? null : mapTargetToTypeHint(selector.target)

  let items: AssetListItem[] = []

  if (combinedQuery) {
    items = await searchWorkspaceAssets({
      userId: context.userId,
      query: combinedQuery,
      timeFilter,
      typeHint,
    })
  } else {
    items = await listWorkspaceAssets({
      userId: context.userId,
      type: typeHint ?? undefined,
      limit: timeFilter ? Math.max(limit, 100) : limit,
    })
    if (timeFilter && timeFilter.kind === 'exact_range') {
      const startsAt = new Date(timeFilter.startIso)
      const endsAt = new Date(timeFilter.endIso)
      items = items.filter((item) =>
        matchesSearchTimeHint(item as never, { startsAt, endsAt }, timeFilter.phrase)
      )
    }
  }

  if (selector.statusConstraint && selector.statusConstraint !== 'all') {
    const isDone = selector.statusConstraint === 'done'
    items = items.filter(
      (item) => item.type === 'todo' && (isDone ? item.completed === true : item.completed !== true)
    )
  }

  if (preferRecent) {
    items = sortItemsByRecency(items)
  }

  items = narrowItemsByExactIdentifierMatch(items, selector)
  items = items.slice(0, limit)

  const mode: ResolutionMode = items.length === 0 ? 'none' : items.length === 1 ? 'single' : 'multiple'

  return { mode, items, total: items.length }
}

function buildSelectorQuery(selector: WorkspaceSelector): string | null {
  const parts = [selector.subject, ...(selector.keywords ?? [])].filter(Boolean)
  const unique = [...new Set(parts)]
  return unique.length > 0 ? unique.join(' ') : null
}

function narrowItemsByExactIdentifierMatch(items: AssetListItem[], selector: WorkspaceSelector) {
  const exactTokens = extractHighSignalExactTokens([
    selector.subject,
    ...(selector.keywords ?? []),
  ])

  if (exactTokens.length === 0) {
    return items
  }

  const scoredItems = items.map((item) => {
    const searchable = normalizeSearchText(
      [item.title, item.originalText, item.excerpt, item.url].filter(Boolean).join(' ')
    )
    const normalizedTitle = normalizeSearchText(item.title ?? '')
    const everyTokenMatch = exactTokens.every((token) => searchable.includes(token))
    const titleStartsWithToken = exactTokens.some((token) => normalizedTitle.startsWith(token))
    return { item, everyTokenMatch, titleStartsWithToken }
  })

  const exactMatches = scoredItems.filter((r) => r.everyTokenMatch)
  if (exactMatches.length === 0) {
    return items
  }

  exactMatches.sort((a, b) => {
    if (a.titleStartsWithToken !== b.titleStartsWithToken) {
      return a.titleStartsWithToken ? -1 : 1
    }
    return 0
  })

  return exactMatches.slice(0, 2).map((r) => r.item)
}

function extractHighSignalExactTokens(parts: Array<string | undefined>) {
  const combined = normalizeSearchText(parts.filter(Boolean).join(' '))
  if (!combined) {
    return []
  }

  const tokenMatches = combined.match(/[a-z0-9_-]{6,}/g) ?? []
  return Array.from(
    new Set(
      tokenMatches.filter(
        (token) =>
          /[a-z]/.test(token) &&
          /\d/.test(token)
      )
    )
  )
}

function mapTargetToTypeHint(target: string): 'note' | 'todo' | 'link' | undefined {
  if (target === 'notes') return 'note'
  if (target === 'todos') return 'todo'
  if (target === 'bookmarks') return 'link'
  return undefined
}

function sortItemsByRecency(items: AssetListItem[]) {
  return [...items].sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
}

function buildTimeFilterFromConstraint(tc: WorkspaceTimeConstraint | null | undefined): WorkspaceAgentTimeFilter {
  return timeConstraintToFilter(tc, getCurrentShanghaiTime().toDate())
}

function getCurrentShanghaiTime() {
  return dayjs().tz(ASIA_SHANGHAI_TIME_ZONE)
}

// ── Legacy helpers (transitional) ─────────────────────────────────────

function buildLookupQuery(query: string | null | undefined, subjectHint: string | null | undefined) {
  const combined = [query?.trim(), subjectHint?.trim()].filter(Boolean).join(' ').trim()
  return combined.length > 0 ? combined : null
}

function buildBookmarkRawInput(input: {
  title?: string | null
  note?: string | null
  summary?: string | null
  url: string
}) {
  const url = input.url.trim()
  const title = input.title?.trim()
  const dedupedTitle = title && title !== url ? title : null
  const note = input.note?.trim()
  const summary = input.summary?.trim()
  const bookmarkContext = note && note !== summary ? [note, summary].filter(Boolean) : [note ?? summary].filter(Boolean)
  return [dedupedTitle, ...bookmarkContext, url].filter(Boolean).join('\n\n')
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

function buildTimeFilter(timeRange: WorkspaceToolTimeRange): WorkspaceAgentTimeFilter | null {
  if (!timeRange || timeRange.type === 'recent') {
    return null
  }

  if (timeRange.type === 'custom') {
    if (!timeRange.startAt && !timeRange.endAt) return null
    const startsAt = timeRange.startAt ? new Date(timeRange.startAt) : new Date(0)
    const endsAt = timeRange.endAt ? new Date(timeRange.endAt) : new Date('9999-12-31T23:59:59.999Z')
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || startsAt >= endsAt) return null
    return toExactRangeTimeFilter({ phrase: 'custom', startsAt, endsAt, basis: 'workspace-tool-custom-range' })
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
  if (!timeFilter || timeFilter.kind !== 'exact_range') return items
  const startsAt = new Date(timeFilter.startIso)
  const endsAt = new Date(timeFilter.endIso)
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || startsAt >= endsAt) return items
  return items.filter((item) => matchesSearchTimeHint(item as never, { startsAt, endsAt }, timeFilter.phrase))
}

function toQueryResult(
  target: 'notes' | 'todos' | 'bookmarks' | 'mixed',
  items: AssetListItem[]
): WorkspaceToolResult {
  return { ok: true, target, items, total: items.length }
}

function toMutationResult(
  target: 'notes' | 'todos' | 'bookmarks',
  action: 'create' | 'update',
  item: AssetListItem | null
): WorkspaceToolResult {
  return { ok: true, target, action, item }
}

async function searchAssetsByType(input: {
  userId: string
  typeHint: 'note' | 'todo' | 'link'
  query?: string | null
  subjectHint?: string | null
  timeRange?: WorkspaceToolTimeRange
  limit?: number
  recentFocus?: boolean
}): Promise<AssetListItem[]> {
  const combinedQuery = buildLookupQuery(input.query, input.subjectHint)
  const timeFilter = buildTimeFilter(input.timeRange)

  if (combinedQuery) {
    const items = await searchWorkspaceAssets({
      userId: input.userId,
      query: combinedQuery,
      timeFilter,
      typeHint: input.typeHint,
    })
    return input.recentFocus
      ? sortItemsByRecency(items).slice(0, input.limit)
      : items.slice(0, input.limit)
  }

  const items = await listWorkspaceAssets({
    userId: input.userId,
    type: input.typeHint,
    limit: timeFilter ? Math.max(input.limit ?? 10, 100) : input.limit,
  })

  const filtered = filterItemsByTimeRange(items, input.timeRange)
  return input.recentFocus ? sortItemsByRecency(filtered).slice(0, input.limit) : filtered.slice(0, input.limit)
}

async function resolveTodoId(input: {
  userId: string
  selector: {
    id?: string | null
    query?: string | null
    subjectHint?: string | null
  }
}) {
  if (input.selector.id) return input.selector.id

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

// ── Workspace Tools ───────────────────────────────────────────────────

export const workspaceTools = {
  search_notes: {
    name: 'search_notes',
    inputSchema: searchInputSchema,
    async execute(input, context) {
      if (input.selector) {
        const resolution = await resolveWorkspaceTargets(
          {
            ...input.selector,
            target: 'notes',
          },
          context
        )
        return toQueryResult('notes', resolution.items)
      }

      const items = await searchAssetsByType({
        userId: context.userId,
        typeHint: 'note',
        query: input.query,
        subjectHint: input.subjectHint,
        timeRange: input.timeRange,
        limit: input.limit,
        recentFocus: input.recentFocus,
      })
      return toQueryResult('notes', items)
    },
  } satisfies WorkspaceTool<z.infer<typeof searchInputSchema>>,
  search_all: {
    name: 'search_all',
    inputSchema: searchInputSchema,
    async execute(input, context) {
      if (input.selector) {
        const resolution = await resolveWorkspaceTargets(input.selector, context)
        return toQueryResult(input.selector.target, resolution.items)
      }

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
        combinedQuery
          ? (input.recentFocus ? sortItemsByRecency(items).slice(0, input.limit) : items.slice(0, input.limit))
          : filterItemsByTimeRange(items, input.timeRange).slice(0, input.limit)
      )
    },
  } satisfies WorkspaceTool<z.infer<typeof searchInputSchema>>,
  search_todos: {
    name: 'search_todos',
    inputSchema: searchTodosInputSchema,
    async execute(input, context) {
      if (input.selector) {
        const resolution = await resolveWorkspaceTargets(
          {
            ...input.selector,
            target: 'todos',
            statusConstraint: input.selector.statusConstraint ?? input.status,
          },
          context
        )
        return toQueryResult('todos', resolution.items)
      }

      const items = await searchAssetsByType({
        userId: context.userId,
        typeHint: 'todo',
        query: input.query,
        subjectHint: input.subjectHint,
        timeRange: input.timeRange,
        limit: input.limit,
        recentFocus: input.recentFocus,
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
      if (input.selector) {
        const resolution = await resolveWorkspaceTargets(
          {
            ...input.selector,
            target: 'bookmarks',
          },
          context
        )
        return toQueryResult('bookmarks', resolution.items)
      }

      const items = await searchAssetsByType({
        userId: context.userId,
        typeHint: 'link',
        query: input.query,
        subjectHint: input.subjectHint,
        timeRange: input.timeRange,
        limit: input.limit,
        recentFocus: input.recentFocus,
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
          right && typeof right === 'object' && 'createdAt' in right && right.createdAt instanceof Date
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
      const asset = await createWorkspaceNoteAsset({
        userId: context.userId,
        rawInput: input.content,
        content: input.content,
      })
      return toMutationResult('notes', 'create', asset)
    },
  } satisfies WorkspaceTool<z.infer<typeof createNoteInputSchema>>,
  create_todo: {
    name: 'create_todo',
    inputSchema: createTodoInputSchema,
    async execute(input, context) {
      const asset = await createWorkspaceTodoAsset({
        userId: context.userId,
        rawInput: input.title,
        title: input.title,
        content: input.details ?? null,
        timeText: input.timeText ?? null,
        dueAt: input.dueAt ? new Date(input.dueAt) : null,
      })
      return toMutationResult('todos', 'create', asset)
    },
  } satisfies WorkspaceTool<z.infer<typeof createTodoInputSchema>>,
  create_bookmark: {
    name: 'create_bookmark',
    inputSchema: createBookmarkInputSchema,
    async execute(input, context) {
      const asset = await createWorkspaceLinkAsset({
        userId: context.userId,
        rawInput: buildBookmarkRawInput(input),
        url: input.url,
        title: input.title ?? null,
        note: input.note ?? null,
        summary: input.summary ?? null,
      })
      return toMutationResult('bookmarks', 'create', asset)
    },
  } satisfies WorkspaceTool<z.infer<typeof createBookmarkInputSchema>>,
  update_todo: {
    name: 'update_todo',
    inputSchema: updateTodoInputSchema,
    async execute(input, context) {
      let todoId: string | null = input.selector.id ?? null

      if (!todoId && input.semanticSelector) {
        const resolution = await resolveWorkspaceTargets(
          {
            ...input.semanticSelector,
            target: 'todos',
          },
          context
        )

        if (resolution.mode === 'single') {
          todoId = resolution.items[0]?.id ?? null
        }
      }

      if (!todoId) {
        todoId = await resolveTodoId({
          userId: context.userId,
          selector: input.selector,
        })
      }

      let updatedTodo: AssetListItem | null = null

      const hasFieldPatch =
        input.patch.title !== undefined ||
        input.patch.details !== undefined ||
        input.patch.timeText !== undefined ||
        input.patch.dueAt !== undefined

      if (hasFieldPatch) {
        updatedTodo = await updateWorkspaceTodoAsset({
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
        updatedTodo = await setWorkspaceTodoAssetCompletion({
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
