import 'server-only'

import { ASSET_SEARCH_LIMIT_DEFAULT } from '@/server/config/constants'
import { createAsset, searchAssets } from '@/server/assets/assets.service'
import { reviewUnfinishedTodos } from '@/server/assets/assets.todo-review'
import { summarizeRecentNotes } from '@/server/assets/assets.note-summary'
import { summarizeRecentBookmarks } from '@/server/assets/assets.bookmark-summary'
import type { CreateWorkspaceAssetInput, WorkspaceAssetActionResult } from './workspace.types'

export async function createWorkspaceAssetUseCase(
  input: CreateWorkspaceAssetInput
): Promise<WorkspaceAssetActionResult> {
  const result = await createAsset({ userId: input.userId, text: input.text })

  if (result.kind === 'search') {
    const results = await searchAssets({
      userId: input.userId,
      query: result.query || input.text,
      typeHint: result.typeHint,
      timeHint: result.timeHint,
      completionHint: result.completionHint,
      limit: ASSET_SEARCH_LIMIT_DEFAULT,
    })

    return {
      kind: 'query',
      query: result.query || input.text,
      results,
    }
  }

  if (result.kind === 'summary') {
    if (result.summaryTarget === 'unfinished_todos') {
      const review = await reviewUnfinishedTodos(input.userId)
      return { kind: 'todo-review', review }
    }
    if (result.summaryTarget === 'recent_notes') {
      const summary = await summarizeRecentNotes(input.userId)
      return { kind: 'note-summary', summary }
    }
    const summary = await summarizeRecentBookmarks(input.userId)
    return { kind: 'bookmark-summary', summary }
  }

  return { kind: 'created', asset: result.asset }
}
