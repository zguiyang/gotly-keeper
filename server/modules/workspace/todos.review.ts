import 'server-only'

import { generateText, Output } from 'ai'
import { z } from 'zod'

import { renderPrompt } from '@/server/lib/prompt-template'
import { listIncompleteTodoAssets } from '@/server/services/assets/assets.service'
import { nowIso, dayjs } from '@/shared/time/dayjs'

import { getAiProvider } from '../../lib/ai/ai-provider'
import { TODO_REVIEW_LIMIT, TODO_REVIEW_MODEL_TIMEOUT_MS } from '../../lib/config/constants'

import type { AssetListItem, TodoReviewResult, TodoReviewSource } from '@/shared/assets/assets.types'

export type TodoReviewPromptItem = {
  id: string
  text: string
  timeText: string | null
  dueAt: string | null
  createdAt: string
}

export function buildTodoReviewPromptInput(todos: AssetListItem[]): TodoReviewPromptItem[] {
  return todos.slice(0, TODO_REVIEW_LIMIT).map((todo) => ({
    id: todo.id,
    text: todo.originalText,
    timeText: todo.timeText,
    dueAt: todo.dueAt ? dayjs(todo.dueAt).toISOString() : null,
    createdAt: dayjs(todo.createdAt).toISOString(),
  }))
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

function mapReviewSources(
  todos: AssetListItem[],
  sourceAssetIds: string[]
): TodoReviewSource[] {
  const requested = new Set(sourceAssetIds)
  return todos
    .filter((todo) => requested.has(todo.id))
    .map((todo) => ({
      id: todo.id,
      title: todo.title,
      timeText: todo.timeText,
      dueAt: todo.dueAt,
    }))
}

function normalizeTodoReviewOutput(
  output: TodoReviewOutput,
  todos: AssetListItem[]
): TodoReviewResult {
  const validIds = new Set(todos.map((todo) => todo.id))
  const filteredSourceIds = output.sourceAssetIds.filter((id) => validIds.has(id))
  const fallbackIds = todos.slice(0, 5).map((todo) => todo.id)
  const finalSourceIds = filteredSourceIds.length ? filteredSourceIds : fallbackIds

  return {
    headline: output.headline,
    summary: output.summary,
    nextActions: output.nextActions,
    sourceAssetIds: finalSourceIds,
    sources: mapReviewSources(todos, finalSourceIds),
    generatedAt: dayjs().toDate(),
  }
}

export async function reviewWorkspaceUnfinishedTodosInternal(
  userId: string
): Promise<TodoReviewResult> {
  const todos = await listIncompleteTodoAssets(userId, TODO_REVIEW_LIMIT)

  if (todos.length === 0) {
    return normalizeTodoReviewOutput(getFallbackTodoReview(todos), todos)
  }

  const model = getAiProvider()
  if (!model) {
    return normalizeTodoReviewOutput(getFallbackTodoReview(todos), todos)
  }

  try {
    const [systemPrompt, userPrompt] = await Promise.all([
      renderPrompt('workspace/todo-review.system', {}),
      renderPrompt('workspace/todo-review.user', {
        payloadJson: JSON.stringify({
          currentTime: nowIso(),
          todos: buildTodoReviewPromptInput(todos),
        }),
      }),
    ])

    const result = await generateText({
      model,
      output: Output.object({ schema: todoReviewOutputSchema }),
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0,
      maxRetries: 1,
      timeout: TODO_REVIEW_MODEL_TIMEOUT_MS,
      providerOptions: {
        alibaba: {
          enableThinking: false,
        },
      },
    })

    return normalizeTodoReviewOutput(result.output, todos)
  } catch (error) {
    console.warn('[todos.review] AI review failed; using fallback', {
      error: error instanceof Error ? error.message : String(error),
    })
    return normalizeTodoReviewOutput(getFallbackTodoReview(todos), todos)
  }
}
