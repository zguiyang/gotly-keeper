import 'server-only'

import { reviewUnfinishedTodos } from '@/server/todos/todos.review.service'
import type { ReviewUnfinishedTodosInput, TodoReviewResult } from './workspace.types'

export async function reviewUnfinishedTodosUseCase(
  input: ReviewUnfinishedTodosInput
): Promise<TodoReviewResult> {
  return reviewUnfinishedTodos(input.userId)
}
