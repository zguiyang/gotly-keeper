import 'server-only'

import { generateText, Output } from 'ai'

import { getAiProvider } from '@/server/ai/ai-provider'
import { listIncompleteTodoAssets } from '@/server/assets/assets.service'
import { TODO_REVIEW_LIMIT } from '@/server/config/constants'
import type { AssetListItem, TodoReviewResult, TodoReviewSource } from '@/shared/assets/assets.types'

export { TODO_REVIEW_LIMIT }

export type TodoReviewPromptItem = {
  id: string
  text: string
  timeText: string | null
  dueAt: string | null
  createdAt: string
}

export function buildTodoReviewPromptInput(
  todos: AssetListItem[]
): TodoReviewPromptItem[] {
  return todos.slice(0, TODO_REVIEW_LIMIT).map((todo) => ({
    id: todo.id,
    text: todo.originalText,
    timeText: todo.timeText,
    dueAt: todo.dueAt ? new Date(todo.dueAt).toISOString() : null,
    createdAt: new Date(todo.createdAt).toISOString(),
  }))
}

const todoReviewOutputSchema = {
  headline: { type: 'string', minLength: 1, maxLength: 80 },
  summary: { type: 'string', minLength: 1, maxLength: 600 },
  nextActions: { type: 'array', items: { type: 'string', minLength: 1, maxLength: 120 }, maxLength: 5 },
  sourceAssetIds: { type: 'array', items: { type: 'string', minLength: 1 }, minLength: 1, maxLength: 10 },
} as const

export type TodoReviewOutput = {
  headline: string
  summary: string
  nextActions: string[]
  sourceAssetIds: string[]
}

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
    generatedAt: new Date(),
  }
}

const TODO_REVIEW_SYSTEM_PROMPT = `You generate a short Chinese review for a user's unfinished todos.

Rules:
- Use only the provided todo records.
- Do not invent tasks, deadlines, or context.
- Keep the tone concise and practical.
- Return sourceAssetIds that refer only to provided todo ids.
- If there are no todos, say there is nothing pending.`

export async function reviewUnfinishedTodos(userId: string): Promise<TodoReviewResult> {
  const todos = await listIncompleteTodoAssets(userId, TODO_REVIEW_LIMIT)

  if (todos.length === 0) {
    return normalizeTodoReviewOutput(getFallbackTodoReview(todos), todos)
  }

  const model = getAiProvider()
  if (!model) {
    return normalizeTodoReviewOutput(getFallbackTodoReview(todos), todos)
  }

  try {
    const result = await generateText({
      model,
      output: Output.object({ schema: todoReviewOutputSchema }),
      system: TODO_REVIEW_SYSTEM_PROMPT,
      prompt: JSON.stringify({
        currentTime: new Date().toISOString(),
        todos: buildTodoReviewPromptInput(todos),
      }),
      temperature: 0,
      maxRetries: 1,
      timeout: 30000,
      providerOptions: {
        alibaba: {
          enableThinking: false,
        },
      },
    })

    return normalizeTodoReviewOutput(result.output as TodoReviewOutput, todos)
  } catch (error) {
    console.warn('[todos.review] AI review failed; using fallback', {
      error: error instanceof Error ? error.message : String(error),
    })
    return normalizeTodoReviewOutput(getFallbackTodoReview(todos), todos)
  }
}
