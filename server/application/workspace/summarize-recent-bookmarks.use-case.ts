import 'server-only'

import { summarizeRecentBookmarks } from '@/server/bookmarks/bookmarks.summary.service'
import type { SummarizeRecentBookmarksInput, BookmarkSummaryResult } from './workspace.types'

export async function summarizeRecentBookmarksUseCase(
  input: SummarizeRecentBookmarksInput
): Promise<BookmarkSummaryResult> {
  return summarizeRecentBookmarks(input.userId)
}
