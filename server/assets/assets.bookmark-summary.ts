import 'server-only'

export {
  summarizeRecentBookmarks,
  buildBookmarkSummaryPromptInput,
  BOOKMARK_SUMMARY_LIMIT,
  type BookmarkSummaryPromptItem,
  type BookmarkSummaryOutput,
} from '@/server/bookmarks/bookmarks.summary.service'
