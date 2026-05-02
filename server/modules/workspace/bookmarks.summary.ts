import 'server-only'

import { z } from 'zod'

import { BOOKMARK_SUMMARY_LIMIT, BOOKMARK_SUMMARY_MODEL_TIMEOUT_MS } from '@/server/lib/config/ai'
import { listBookmarks } from '@/server/services/bookmarks'
import { searchAssets } from '@/server/services/search/assets-search.service'
import { toAssetListItemFromBookmark } from '@/server/services/workspace/asset-list-item'
import { dayjs } from '@/shared/time/dayjs'

import {
  buildWorkspaceAssetPromptInput,
  generateWorkspaceInsight,
} from './asset-insight'

import type { AssetListItem, BookmarkSummaryResult } from '@/shared/assets/assets.types'

type BookmarkSummaryPromptItem = {
  id: string
  text: string
  url: string | null
  createdAt: string
}

export function buildBookmarkSummaryPromptInput(
  bookmarks: AssetListItem[]
): BookmarkSummaryPromptItem[] {
  return buildWorkspaceAssetPromptInput({
    assets: bookmarks,
    limit: BOOKMARK_SUMMARY_LIMIT,
    mapAsset: (bookmark) => ({
      id: bookmark.id,
      text: bookmark.originalText,
      url: bookmark.url,
      createdAt: dayjs(bookmark.createdAt).toISOString(),
    }),
  })
}

const bookmarkSummaryOutputSchema = z.object({
  headline: z.string().min(1).max(80),
  summary: z.string().min(1).max(700),
  keyPoints: z.array(z.string().min(1).max(140)).max(6),
  sourceAssetIds: z.array(z.string().min(1)).min(1).max(10),
})

type BookmarkSummaryOutput = z.infer<typeof bookmarkSummaryOutputSchema>

function getFallbackBookmarkSummary(bookmarks: AssetListItem[]): BookmarkSummaryOutput {
  return {
    headline: '最近书签摘要',
    summary: bookmarks.length
      ? `最近有 ${bookmarks.length} 条书签，先回看最靠前的几条链接。`
      : '目前没有可总结的书签。',
    keyPoints: bookmarks.slice(0, 3).map((bookmark) => bookmark.title),
    sourceAssetIds: bookmarks.slice(0, 5).map((bookmark) => bookmark.id),
  }
}

export async function summarizeWorkspaceRecentBookmarksInternal(
  userId: string,
  query?: string | null
): Promise<BookmarkSummaryResult> {
  const trimmedQuery = query?.trim()
  const bookmarks = trimmedQuery
    ? (await searchAssets({
        userId,
        query: trimmedQuery,
        typeHint: 'link',
        limit: BOOKMARK_SUMMARY_LIMIT,
      })).filter((asset) => asset.type === 'link')
    : (await listBookmarks({ userId, limit: BOOKMARK_SUMMARY_LIMIT })).map(
        toAssetListItemFromBookmark
      )

  return generateWorkspaceInsight({
    assets: bookmarks,
    buildPromptInput: buildBookmarkSummaryPromptInput,
    fallbackOutput: getFallbackBookmarkSummary,
    schema: bookmarkSummaryOutputSchema,
    promptKey: 'workspace/bookmark-summary',
    promptPayloadKey: 'bookmarks',
    timeoutMs: BOOKMARK_SUMMARY_MODEL_TIMEOUT_MS,
    logTag: 'bookmarks.summary',
    logLabel: 'summary',
    normalizeResult: (output, context) => {
      return {
        headline: output.headline,
        summary: output.summary,
        keyPoints: output.keyPoints,
        sourceAssetIds: context.sourceAssetIds,
        sources: context.sources,
        generatedAt: context.generatedAt,
      }
    },
  })
}
