import 'server-only'

import { z } from 'zod'

import { searchAssets } from '@/server/services/search/assets-search.service'
import { listIncompleteTodos } from '@/server/services/todos'
import { toAssetListItemFromTodo } from '@/server/services/workspace/asset-list-item'
import { dayjs } from '@/shared/time/dayjs'

import { TODO_REVIEW_LIMIT, TODO_REVIEW_MODEL_TIMEOUT_MS } from '../../lib/config/constants'

import {
  buildWorkspaceAssetPromptInput,
  generateWorkspaceInsight,
} from './asset-insight'

import type { AssetListItem, TodoReviewResult } from '@/shared/assets/assets.types'

export type TodoReviewPromptItem = {
  id: string
  text: string
  timeText: string | null
  dueAt: string | null
  createdAt: string
}

export function buildTodoReviewPromptInput(todos: AssetListItem[]): TodoReviewPromptItem[] {
  return buildWorkspaceAssetPromptInput({
    assets: todos,
    limit: TODO_REVIEW_LIMIT,
    mapAsset: (todo) => ({
      id: todo.id,
      text: todo.originalText,
      timeText: todo.timeText,
      dueAt: todo.dueAt ? dayjs(todo.dueAt).toISOString() : null,
      createdAt: dayjs(todo.createdAt).toISOString(),
    }),
  })
}

const todoReviewOutputSchema = z.object({
  headline: z.string().min(1).max(80),
  summary: z.string().min(1).max(600),
  nextActions: z.array(z.string().min(1).max(120)).max(5),
  sourceAssetIds: z.array(z.string().min(1)).min(1).max(10),
})

type TodoReviewOutput = z.infer<typeof todoReviewOutputSchema>

function getFallbackTodoReview(todos: AssetListItem[]): TodoReviewOutput {
  return {
    headline: '待办复盘',
    summary: todos.length
      ? `你还有 ${todos.length} 个未完成待办，先从时间最明确的事项开始处理。`
      : '目前没有未完成待办。',
    nextActions: todos.slice(0, 3).map((todo) => todo.title),
    sourceAssetIds: todos.slice(0, 5).map((todo) => todo.id),
  }
}

export async function reviewWorkspaceUnfinishedTodosInternal(
  userId: string,
  query?: string | null
): Promise<TodoReviewResult> {
  const trimmedQuery = query?.trim()
  const todos = trimmedQuery
    ? (await searchAssets({
        userId,
        query: trimmedQuery,
        typeHint: 'todo',
        completionHint: 'incomplete',
        limit: TODO_REVIEW_LIMIT,
      })).filter((asset) => asset.type === 'todo')
    : (await listIncompleteTodos(userId, TODO_REVIEW_LIMIT)).map(toAssetListItemFromTodo)

  return generateWorkspaceInsight({
    assets: todos,
    buildPromptInput: buildTodoReviewPromptInput,
    fallbackOutput: getFallbackTodoReview,
    schema: todoReviewOutputSchema,
    promptKey: 'workspace/todo-review',
    promptPayloadKey: 'todos',
    timeoutMs: TODO_REVIEW_MODEL_TIMEOUT_MS,
    logTag: 'todos.review',
    logLabel: 'review',
    normalizeResult: (output, context) => {
      return {
        headline: output.headline,
        summary: output.summary,
        nextActions: output.nextActions,
        sourceAssetIds: context.sourceAssetIds,
        sources: context.sources,
        generatedAt: context.generatedAt,
      }
    },
  })
}
