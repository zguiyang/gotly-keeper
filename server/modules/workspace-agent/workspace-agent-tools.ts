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
        rawInputPreview: z.string().min(1),
        normalizedRequest: z.string().min(1),
        assetType: z.enum(['note', 'todo', 'link']),
        title: z.string().min(1).nullable(),
        content: z.string().min(1).nullable(),
        url: z.url().nullable(),
        note: z.string().min(1).nullable(),
        timeText: z.string().min(1).nullable(),
        dueAtIso: z.string().datetime().nullable(),
        publicReason: z.string().min(1),
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
        const created =
          assetType === 'todo'
            ? await createWorkspaceTodo({
                userId,
                rawInput: rawInputPreview,
                title: title ?? normalizedRequest,
                content,
                timeText,
                dueAt: dueAtIso ? new Date(dueAtIso) : null,
              })
            : assetType === 'link' && url
              ? await createWorkspaceLink({
                  userId,
                  rawInput: rawInputPreview,
                  url,
                  title,
                  note,
                  summary: null,
                })
              : await createWorkspaceNote({
                  userId,
                  rawInput: rawInputPreview,
                  title,
                  content: content ?? normalizedRequest,
                  summary: null,
                })

        return toToolOutput(toCreatedResultWithNotice(created), [
          traceInput(rawInputPreview, normalizedRequest),
          traceIntent({
            operation: 'create',
            assetType: created.asset.type,
            publicReason,
          }),
          traceParameters({
            assetType,
            title,
            content,
            url,
            timeText,
            dueAtIso,
          }),
          {
            type: 'tool_selected',
            title: '选择工具',
            toolName: 'create_workspace_asset',
            publicReason,
          },
          traceTool(
            'create_workspace_asset',
            { assetType: created.asset.type, title, timeText },
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
            traceIntent({
              operation: 'search',
              assetType: typeHint ?? 'mixed',
              publicReason,
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
        limit: z.number().int().positive().max(50).optional(),
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
          traceIntent({
            operation: 'summarize',
            assetType:
              target === 'todos' ? 'todo' : target === 'bookmarks' ? 'link' : 'note',
            publicReason,
          }),
          traceParameters({ target, query }),
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
            traceIntent({
              operation: 'capabilities',
              assetType: null,
              publicReason,
            }),
            traceParameters({}),
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

  }
}
