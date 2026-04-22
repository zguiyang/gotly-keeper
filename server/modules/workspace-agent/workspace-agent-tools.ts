import 'server-only'

import { tool } from 'ai'
import { z } from 'zod'

import {
  createWorkspaceLink,
  createWorkspaceNote,
  createWorkspaceTodo,
  reviewWorkspaceUnfinishedTodos,
  searchWorkspaceAssets,
  summarizeWorkspaceRecentBookmarks,
  summarizeWorkspaceRecentNotes,
} from '@/server/modules/workspace'

import type {
  WorkspaceAgentTimeFilter,
  WorkspaceAgentToolName,
  WorkspaceAgentToolOutput,
  WorkspaceAgentTraceEvent,
} from './workspace-agent.types'

const timeFilterSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('none') }),
  z.object({
    kind: z.literal('exact_range'),
    phrase: z.string().min(1),
    startIso: z.string().datetime(),
    endIso: z.string().datetime(),
    basis: z.string().min(1),
  }),
  z.object({
    kind: z.literal('vague'),
    phrase: z.string().min(1),
    reason: z.string().min(1),
  }),
])

const assetTypeSchema = z.enum(['todo', 'note', 'link']).nullable()
const completionHintSchema = z.enum(['complete', 'incomplete']).nullable()
const summaryTargetSchema = z.enum(['todos', 'notes', 'bookmarks'])
const URL_REGEX = /https?:\/\/[^\s]+/i
const TODO_KEYWORDS = ['记得', '提醒', '待办', '要', '处理', '发', '提交', '整理', '预订', '回复']
const NOTE_KEYWORDS = ['笔记', '记一下', '记录', '想法', '草稿', '备忘']
const BOOKMARK_KEYWORDS = ['书签', '收藏', '链接', '文章', '网址']

function nullableInputToNull(value: string | null | undefined) {
  return typeof value === 'string' && value.trim().length === 0 ? null : value
}

const nullableStringInputSchema = z.union([z.string().min(1), z.literal(''), z.null()])
const nullableUrlInputSchema = z.union([z.url(), z.literal(''), z.null()])
const nullableDateTimeInputSchema = z.union([z.string().datetime(), z.literal(''), z.null()])

function normalizedMetaText(value: string | null | undefined, fallback: string) {
  const normalizedValue = nullableInputToNull(value)?.trim()
  return normalizedValue && normalizedValue.length > 0 ? normalizedValue : fallback
}

function inferAssetType(input: {
  assetType: 'note' | 'todo' | 'link' | null | undefined
  rawInputPreview: string
  normalizedRequest: string
  url: string | null
  timeText: string | null
  dueAtIso: string | null
}): 'note' | 'todo' | 'link' {
  if (input.assetType) {
    return input.assetType
  }

  if (input.url || URL_REGEX.test(input.rawInputPreview) || URL_REGEX.test(input.normalizedRequest)) {
    return 'link'
  }

  if (
    input.timeText ||
    input.dueAtIso ||
    TODO_KEYWORDS.some(
      (keyword) => input.rawInputPreview.includes(keyword) || input.normalizedRequest.includes(keyword)
    )
  ) {
    return 'todo'
  }

  if (
    NOTE_KEYWORDS.some(
      (keyword) => input.rawInputPreview.includes(keyword) || input.normalizedRequest.includes(keyword)
    )
  ) {
    return 'note'
  }

  return 'note'
}

function inferSummaryTarget(input: {
  target: 'todos' | 'notes' | 'bookmarks' | null | undefined
  rawInputPreview: string
  normalizedRequest: string
  query: string | null
}): 'todos' | 'notes' | 'bookmarks' {
  if (input.target) {
    return input.target
  }

  const combinedText = [input.rawInputPreview, input.normalizedRequest, input.query ?? '']
    .filter(Boolean)
    .join(' ')

  if (combinedText.includes('待办')) {
    return 'todos'
  }

  if (
    BOOKMARK_KEYWORDS.some((keyword) => combinedText.includes(keyword))
  ) {
    return 'bookmarks'
  }

  return 'notes'
}

function traceInput(
  rawInputPreview: string,
  normalizedRequest: string
): WorkspaceAgentTraceEvent {
  return {
    type: 'input_normalized',
    title: '清理输入',
    rawInputPreview,
    normalizedRequest,
  }
}

function traceTool(
  toolName: WorkspaceAgentToolName,
  publicArgs: Record<string, unknown>,
  resultSummary: string
): WorkspaceAgentTraceEvent {
  return {
    type: 'tool_executed',
    title: '执行工具',
    toolName,
    publicArgs,
    resultSummary,
  }
}

function traceIntent(input: {
  operation: Extract<WorkspaceAgentTraceEvent, { type: 'intent_identified' }>['operation']
  assetType: Extract<WorkspaceAgentTraceEvent, { type: 'intent_identified' }>['assetType']
  publicReason: string
}): WorkspaceAgentTraceEvent {
  return {
    type: 'intent_identified',
    title: '识别意图',
    operation: input.operation,
    assetType: input.assetType,
    publicReason: input.publicReason,
  }
}

function traceParameters(parameters: Record<string, unknown>): WorkspaceAgentTraceEvent {
  return {
    type: 'parameters_collected',
    title: '收集参数',
    parameters,
  }
}

function toCreatedResultWithNotice(result: Awaited<ReturnType<typeof createWorkspaceNote>>) {
  if (result.kind === 'created' && result.asset.type === 'link') {
    return {
      ...result,
      notice: '已保存书签，页面信息会稍后补全。',
    }
  }

  return result
}

function toToolOutput(
  result: WorkspaceAgentToolOutput['result'],
  trace: WorkspaceAgentToolOutput['trace']
): WorkspaceAgentToolOutput {
  return { result, trace }
}

export function createWorkspaceAgentTools({ userId }: { userId: string }) {
  return {
    create_workspace_asset: tool({
      description:
        '保存一条 workspace 资产。assetType 决定保存为笔记、待办或书签；信息不完整时优先用安全默认值执行。',
      inputSchema: z.object({
        rawInputPreview: nullableStringInputSchema.optional(),
        normalizedRequest: nullableStringInputSchema.optional(),
        assetType: z.enum(['note', 'todo', 'link']).optional().nullable(),
        title: nullableStringInputSchema,
        content: nullableStringInputSchema,
        url: nullableUrlInputSchema,
        note: nullableStringInputSchema,
        timeText: nullableStringInputSchema,
        dueAtIso: nullableDateTimeInputSchema,
        publicReason: nullableStringInputSchema.optional(),
      }),
      execute: async ({
        rawInputPreview,
        normalizedRequest,
        assetType,
        title,
        content,
        url,
        note,
        timeText,
        dueAtIso,
        publicReason,
      }) => {
        const normalizedRawInputPreview = normalizedMetaText(rawInputPreview, '用户输入')
        const normalizedRequestText = normalizedMetaText(normalizedRequest, normalizedRawInputPreview)
        const normalizedPublicReason = normalizedMetaText(publicReason, '按默认规则执行。')
        const normalizedTitle = nullableInputToNull(title)
        const normalizedContent = nullableInputToNull(content)
        const normalizedUrl = nullableInputToNull(url)
        const normalizedNote = nullableInputToNull(note)
        const normalizedTimeText = nullableInputToNull(timeText)
        const normalizedDueAtIso = nullableInputToNull(dueAtIso)
        const resolvedAssetType = inferAssetType({
          assetType,
          rawInputPreview: normalizedRawInputPreview,
          normalizedRequest: normalizedRequestText,
          url: normalizedUrl,
          timeText: normalizedTimeText,
          dueAtIso: normalizedDueAtIso,
        })
        const created =
          resolvedAssetType === 'todo'
            ? await createWorkspaceTodo({
                userId,
                rawInput: normalizedRawInputPreview,
                title: normalizedTitle ?? normalizedRequestText,
                content: normalizedContent,
                timeText: normalizedTimeText,
                dueAt: normalizedDueAtIso ? new Date(normalizedDueAtIso) : null,
              })
            : resolvedAssetType === 'link' && normalizedUrl
              ? await createWorkspaceLink({
                  userId,
                  rawInput: normalizedRawInputPreview,
                  url: normalizedUrl,
                  title: normalizedTitle,
                  note: normalizedNote,
                  summary: null,
                })
              : await createWorkspaceNote({
                  userId,
                  rawInput: normalizedRawInputPreview,
                  title: normalizedTitle,
                  content: normalizedContent ?? normalizedRequestText,
                  summary: null,
                })

        return toToolOutput(toCreatedResultWithNotice(created), [
          traceInput(normalizedRawInputPreview, normalizedRequestText),
          traceIntent({
            operation: 'create',
            assetType: created.asset.type,
            publicReason: normalizedPublicReason,
          }),
          traceParameters({
            assetType: resolvedAssetType,
            title: normalizedTitle,
            content: normalizedContent,
            url: normalizedUrl,
            timeText: normalizedTimeText,
            dueAtIso: normalizedDueAtIso,
          }),
          {
            type: 'tool_selected',
            title: '选择工具',
            toolName: 'create_workspace_asset',
            publicReason: normalizedPublicReason,
          },
          traceTool(
            'create_workspace_asset',
            { assetType: created.asset.type, title: normalizedTitle, timeText: normalizedTimeText },
            created.asset.type === 'todo'
              ? '已保存待办'
              : created.asset.type === 'link'
                ? '已保存书签'
                : '已保存笔记'
          ),
        ])
      },
    }),

    search_workspace: tool({
      description: '查询用户已保存的笔记、待办或书签。时间过滤必须由 agent 传入结构化 timeFilter。',
      inputSchema: z.object({
        rawInputPreview: nullableStringInputSchema.optional(),
        normalizedRequest: nullableStringInputSchema.optional(),
        query: nullableStringInputSchema.optional(),
        typeHint: assetTypeSchema.optional(),
        completionHint: completionHintSchema.optional(),
        timeFilter: timeFilterSchema.optional(),
        publicReason: nullableStringInputSchema.optional(),
      }),
      execute: async ({
        rawInputPreview,
        normalizedRequest,
        query,
        typeHint,
        completionHint,
        timeFilter,
        publicReason,
      }) => {
        const normalizedRawInputPreview = normalizedMetaText(rawInputPreview, '用户输入')
        const normalizedRequestText = normalizedMetaText(normalizedRequest, normalizedRawInputPreview)
        const normalizedPublicReason = normalizedMetaText(publicReason, '按默认规则执行。')
        const normalizedQuery =
          nullableInputToNull(query)?.trim() || normalizedRequestText.trim() || normalizedRawInputPreview.trim()
        const normalizedTimeFilter =
          (timeFilter as WorkspaceAgentTimeFilter | undefined) ?? ({ kind: 'none' } as const)
        const results = await searchWorkspaceAssets({
          userId,
          query: normalizedQuery,
          typeHint,
          completionHint,
          timeFilter: normalizedTimeFilter,
        })

        return toToolOutput(
          {
            kind: 'query',
            query: normalizedQuery,
            queryDescription:
              typeHint === 'link'
                ? '书签'
                : typeHint === 'todo'
                  ? '待办'
                  : typeHint === 'note'
                    ? '笔记'
                    : '全部内容',
            results,
            timeFilter: normalizedTimeFilter,
          },
          [
            traceInput(normalizedRawInputPreview, normalizedRequestText),
            traceIntent({
              operation: 'search',
              assetType: typeHint ?? 'mixed',
              publicReason: normalizedPublicReason,
            }),
            traceParameters({
              query: normalizedQuery,
              typeHint,
              completionHint,
              timeFilterKind: normalizedTimeFilter.kind,
            }),
            ...(normalizedTimeFilter.kind === 'none'
              ? []
              : [
                  {
                    type: 'time_resolved' as const,
                    title: '时间判断' as const,
                    phrase: normalizedTimeFilter.phrase,
                    resolution: normalizedTimeFilter,
                  },
                ]),
            {
              type: 'tool_selected',
              title: '选择工具',
              toolName: 'search_workspace',
              publicReason: normalizedPublicReason,
            },
            traceTool(
              'search_workspace',
              {
                query: normalizedQuery,
                typeHint,
                completionHint,
                timeFilterKind: normalizedTimeFilter.kind,
              },
              `找到 ${results.length} 条结果`
            ),
          ]
        )
      },
    }),

    summarize_workspace: tool({
      description: '总结或复盘已保存的待办、笔记或书签。',
      inputSchema: z.object({
        rawInputPreview: nullableStringInputSchema.optional(),
        normalizedRequest: nullableStringInputSchema.optional(),
        target: summaryTargetSchema.optional().nullable(),
        query: nullableStringInputSchema,
        limit: z.number().int().positive().max(50).optional(),
        publicReason: nullableStringInputSchema.optional(),
      }),
      execute: async ({
        rawInputPreview,
        normalizedRequest,
        target,
        query,
        publicReason,
      }) => {
        const normalizedRawInputPreview = normalizedMetaText(rawInputPreview, '用户输入')
        const normalizedRequestText = normalizedMetaText(normalizedRequest, normalizedRawInputPreview)
        const normalizedPublicReason = normalizedMetaText(publicReason, '按默认规则执行。')
        const normalizedQuery = nullableInputToNull(query)
        const resolvedTarget = inferSummaryTarget({
          target,
          rawInputPreview: normalizedRawInputPreview,
          normalizedRequest: normalizedRequestText,
          query: normalizedQuery,
        })
        const result =
          resolvedTarget === 'todos'
            ? {
                kind: 'todo-review' as const,
                review: await reviewWorkspaceUnfinishedTodos({ userId, query: normalizedQuery }),
              }
            : resolvedTarget === 'notes'
              ? {
                  kind: 'note-summary' as const,
                  summary: await summarizeWorkspaceRecentNotes({ userId, query: normalizedQuery }),
                }
              : {
                  kind: 'bookmark-summary' as const,
                  summary: await summarizeWorkspaceRecentBookmarks({ userId, query: normalizedQuery }),
                }

        return toToolOutput(result, [
          traceInput(normalizedRawInputPreview, normalizedRequestText),
          traceIntent({
            operation: 'summarize',
            assetType:
              resolvedTarget === 'todos' ? 'todo' : resolvedTarget === 'bookmarks' ? 'link' : 'note',
            publicReason: normalizedPublicReason,
          }),
          traceParameters({ target: resolvedTarget, query: normalizedQuery }),
          {
            type: 'tool_selected',
            title: '选择工具',
            toolName: 'summarize_workspace',
            publicReason: normalizedPublicReason,
          },
          traceTool('summarize_workspace', { target: resolvedTarget, query: normalizedQuery }, '已生成总结'),
        ])
      },
    }),

    get_workspace_capabilities: tool({
      description: '说明当前 workspace agent 能做什么。',
      inputSchema: z.object({
        rawInputPreview: nullableStringInputSchema.optional(),
        normalizedRequest: nullableStringInputSchema.optional(),
        publicReason: nullableStringInputSchema.optional(),
      }),
      execute: async ({ rawInputPreview, normalizedRequest, publicReason }) => {
        const normalizedRawInputPreview = normalizedMetaText(rawInputPreview, '用户输入')
        const normalizedRequestText = normalizedMetaText(normalizedRequest, normalizedRawInputPreview)
        const normalizedPublicReason = normalizedMetaText(publicReason, '按默认规则执行。')

        return toToolOutput(
          {
            kind: 'capabilities',
            items: ['保存笔记', '创建待办', '收藏链接', '搜索工作区内容', '总结笔记、待办和书签'],
          },
          [
            traceInput(normalizedRawInputPreview, normalizedRequestText),
            traceIntent({
              operation: 'capabilities',
              assetType: null,
              publicReason: normalizedPublicReason,
            }),
            traceParameters({}),
            {
              type: 'tool_selected',
              title: '选择工具',
              toolName: 'get_workspace_capabilities',
              publicReason: normalizedPublicReason,
            },
            traceTool('get_workspace_capabilities', {}, '已整理当前能力'),
          ]
        )
      },
    }),

  }
}
