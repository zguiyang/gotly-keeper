import 'server-only'

import { tool } from 'ai'
import { z } from 'zod'

import {
  createWorkspaceLink,
  createWorkspaceNote,
  createWorkspaceTodo,
  listWorkspaceRecentAssets,
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

const RETRIEVAL_KEYWORDS = ['找', '查', '搜索', '看看', '列表', '查看', '未完成', '待办', '收藏', '文章']

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

function isLikelyRetrievalRequest(text: string) {
  return RETRIEVAL_KEYWORDS.some((keyword) => text.includes(keyword))
}

function inferSearchHintsFromText(text: string): {
  typeHint: 'todo' | 'note' | 'link' | null
  completionHint: 'complete' | 'incomplete' | null
} {
  const normalized = text.trim()

  const typeHint = normalized.includes('待办')
    ? 'todo'
    : normalized.includes('书签') ||
        normalized.includes('链接') ||
        normalized.includes('网址') ||
        normalized.includes('网页')
      ? 'link'
      : normalized.includes('笔记')
        ? 'note'
        : null

  const completionHint = normalized.includes('未完成')
    ? 'incomplete'
    : normalized.includes('已完成')
      ? 'complete'
      : null

  return { typeHint, completionHint }
}

export function createWorkspaceAgentTools({ userId }: { userId: string }) {
  return {
    create_note: tool({
      description: '保存一条普通笔记。必须用于用户要记录想法、备忘、灵感、文案或非任务型内容时。',
      inputSchema: z.object({
        rawInputPreview: z.string().min(1),
        normalizedRequest: z.string().min(1),
        title: z.string().min(1).nullable(),
        content: z.string().min(1),
        publicReason: z.string().min(1),
      }),
      execute: async ({
        rawInputPreview,
        normalizedRequest,
        title,
        content,
        publicReason,
      }) => {
        const created = await createWorkspaceNote({
          userId,
          rawInput: rawInputPreview,
          title,
          content,
          summary: null,
        })

        return toToolOutput(toCreatedResultWithNotice(created), [
          traceInput(rawInputPreview, normalizedRequest),
          {
            type: 'tool_selected',
            title: '选择工具',
            toolName: 'create_note',
            publicReason,
          },
          traceTool('create_note', { title }, '已保存笔记'),
        ])
      },
    }),

    create_todo: tool({
      description: '保存一条待办事项。',
      inputSchema: z.object({
        rawInputPreview: z.string().min(1),
        normalizedRequest: z.string().min(1),
        title: z.string().min(1),
        content: z.string().min(1).nullable(),
        timeText: z.string().min(1).nullable(),
        dueAtIso: z.string().datetime().nullable(),
        publicReason: z.string().min(1),
      }),
      execute: async ({
        rawInputPreview,
        normalizedRequest,
        title,
        content,
        timeText,
        dueAtIso,
        publicReason,
      }) => {
        const created = await createWorkspaceTodo({
          userId,
          rawInput: rawInputPreview,
          title,
          content,
          timeText,
          dueAt: dueAtIso ? new Date(dueAtIso) : null,
        })

        return toToolOutput(toCreatedResultWithNotice(created), [
          traceInput(rawInputPreview, normalizedRequest),
          {
            type: 'tool_selected',
            title: '选择工具',
            toolName: 'create_todo',
            publicReason,
          },
          traceTool('create_todo', { title, timeText }, '已保存待办'),
        ])
      },
    }),

    create_bookmark: tool({
      description: '保存一条链接或文章收藏。',
      inputSchema: z.object({
        rawInputPreview: z.string().min(1),
        normalizedRequest: z.string().min(1),
        url: z.url(),
        title: z.string().min(1).nullable(),
        note: z.string().min(1).nullable(),
        publicReason: z.string().min(1),
      }),
      execute: async ({
        rawInputPreview,
        normalizedRequest,
        url,
        title,
        note,
        publicReason,
      }) => {
        const created = await createWorkspaceLink({
          userId,
          rawInput: rawInputPreview,
          url,
          title,
          note,
          summary: null,
        })

        return toToolOutput(toCreatedResultWithNotice(created), [
          traceInput(rawInputPreview, normalizedRequest),
          {
            type: 'tool_selected',
            title: '选择工具',
            toolName: 'create_bookmark',
            publicReason,
          },
          traceTool('create_bookmark', { url, title }, '已保存书签'),
        ])
      },
    }),

    search_workspace: tool({
      description: '查询用户已保存的笔记、待办或书签。时间过滤必须由 agent 传入结构化 timeFilter。',
      inputSchema: z.object({
        rawInputPreview: z.string().min(1),
        normalizedRequest: z.string().min(1),
        query: z.string().min(1).nullable().optional(),
        typeHint: assetTypeSchema.optional(),
        completionHint: completionHintSchema.optional(),
        timeFilter: timeFilterSchema.optional(),
        publicReason: z.string().min(1),
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
        const normalizedQuery = query?.trim() || normalizedRequest.trim() || rawInputPreview.trim()
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
            traceInput(rawInputPreview, normalizedRequest),
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
              publicReason,
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
        rawInputPreview: z.string().min(1),
        normalizedRequest: z.string().min(1),
        target: z.enum(['todos', 'notes', 'bookmarks']),
        query: z.string().min(1).nullable(),
        publicReason: z.string().min(1),
      }),
      execute: async ({
        rawInputPreview,
        normalizedRequest,
        target,
        query,
        publicReason,
      }) => {
        const result =
          target === 'todos'
            ? {
                kind: 'todo-review' as const,
                review: await reviewWorkspaceUnfinishedTodos({ userId, query }),
              }
            : target === 'notes'
              ? {
                  kind: 'note-summary' as const,
                  summary: await summarizeWorkspaceRecentNotes({ userId, query }),
                }
              : {
                  kind: 'bookmark-summary' as const,
                  summary: await summarizeWorkspaceRecentBookmarks({ userId, query }),
                }

        return toToolOutput(result, [
          traceInput(rawInputPreview, normalizedRequest),
          {
            type: 'tool_selected',
            title: '选择工具',
            toolName: 'summarize_workspace',
            publicReason,
          },
          traceTool('summarize_workspace', { target, query }, '已生成总结'),
        ])
      },
    }),

    inspect_workspace_context: tool({
      description: '查看轻量 workspace 概况，不返回敏感内部数据。',
      inputSchema: z.object({
        rawInputPreview: z.string().min(1),
        normalizedRequest: z.string().min(1),
        publicReason: z.string().min(1),
      }),
      execute: async ({ rawInputPreview, normalizedRequest, publicReason }) => {
        const recent = await listWorkspaceRecentAssets(userId)
        const unfinishedTodoCount = recent.filter(
          (asset) => asset.type === 'todo' && !asset.completed
        ).length

        return toToolOutput(
          {
            kind: 'context',
            recentAssetCount: recent.length,
            unfinishedTodoCount,
          },
          [
            traceInput(rawInputPreview, normalizedRequest),
            {
              type: 'tool_selected',
              title: '选择工具',
              toolName: 'inspect_workspace_context',
              publicReason,
            },
            traceTool('inspect_workspace_context', {}, `最近有 ${recent.length} 条内容`),
          ]
        )
      },
    }),

    get_workspace_capabilities: tool({
      description: '说明当前 workspace agent 能做什么。',
      inputSchema: z.object({
        rawInputPreview: z.string().min(1),
        normalizedRequest: z.string().min(1),
        publicReason: z.string().min(1),
      }),
      execute: async ({ rawInputPreview, normalizedRequest, publicReason }) =>
        toToolOutput(
          {
            kind: 'capabilities',
            items: ['保存笔记', '创建待办', '收藏链接', '搜索工作区内容', '总结笔记、待办和书签'],
          },
          [
            traceInput(rawInputPreview, normalizedRequest),
            {
              type: 'tool_selected',
              title: '选择工具',
              toolName: 'get_workspace_capabilities',
              publicReason,
            },
            traceTool('get_workspace_capabilities', {}, '已整理当前能力'),
          ]
        ),
    }),

    ask_clarifying_question: tool({
      description: '当请求缺少必要信息或有高风险歧义时，向用户提一个澄清问题。',
      inputSchema: z.object({
        rawInputPreview: z.string().min(1),
        normalizedRequest: z.string().min(1),
        question: z.string().min(1),
        publicReason: z.string().min(1),
      }),
      execute: async ({
        rawInputPreview,
        normalizedRequest,
        question,
        publicReason,
      }) =>
        {
          const retrievalText = normalizedRequest.trim() || rawInputPreview.trim()

          if (isLikelyRetrievalRequest(retrievalText)) {
            const inferred = inferSearchHintsFromText(retrievalText)
            const results = await searchWorkspaceAssets({
              userId,
              query: retrievalText,
              typeHint: inferred.typeHint,
              completionHint: inferred.completionHint,
              timeFilter: { kind: 'none' },
            })

            return toToolOutput(
              {
                kind: 'query',
                query: retrievalText,
                queryDescription:
                  inferred.typeHint === 'todo'
                    ? inferred.completionHint === 'incomplete'
                      ? '待办 · 未完成'
                      : '待办'
                    : inferred.typeHint === 'link'
                      ? '书签'
                      : inferred.typeHint === 'note'
                        ? '笔记'
                        : '全部内容',
                results,
                timeFilter: { kind: 'none' },
              },
              [
                traceInput(rawInputPreview, normalizedRequest),
                {
                  type: 'tool_selected',
                  title: '选择工具',
                  toolName: 'ask_clarifying_question',
                  publicReason,
                },
                traceTool(
                  'search_workspace',
                  {
                    query: retrievalText,
                    typeHint: inferred.typeHint,
                    completionHint: inferred.completionHint,
                    fromClarificationGuard: true,
                  },
                  `自动改为直接检索，找到 ${results.length} 条结果`
                ),
              ]
            )
          }

          return toToolOutput(
            {
              kind: 'clarification',
              question,
            },
            [
              traceInput(rawInputPreview, normalizedRequest),
              {
                type: 'tool_selected',
                title: '选择工具',
                toolName: 'ask_clarifying_question',
                publicReason,
              },
              {
                type: 'clarification_needed',
                title: '需要确认',
                question,
              },
            ]
          )
        },
    }),
  }
}
