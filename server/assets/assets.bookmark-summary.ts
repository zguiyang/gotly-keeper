/**
 * @deprecated This file is FROZEN and will be removed in a future phase.
 * 
 * Canonical owner: server/bookmarks/bookmarks.summary.service.ts
 * 
 * DO NOT modify this file for bug fixes or enhancements.
 * All changes MUST be made to the canonical owner file only.
 * 
 * This file exists solely for backward compatibility during migration.
 */

import 'server-only'

import { generateText, Output } from 'ai'

import { getAiProvider } from '@/server/ai/ai-provider'
import { listLinkAssets } from './assets.service'
import {
  BOOKMARK_SUMMARY_LIMIT,
  buildBookmarkSummaryPromptInput,
} from './assets.bookmark-summary.pure'
import {
  bookmarkSummaryOutputSchema,
  type BookmarkSummaryOutput,
} from './assets.bookmark-summary.schema'
import {
  type AssetListItem,
  type BookmarkSummaryResult,
  type BookmarkSummarySource,
} from '@/shared/assets/assets.types'
import { BOOKMARK_SUMMARY_MODEL_TIMEOUT_MS } from '@/server/config/constants'

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

function mapSummarySources(
  bookmarks: AssetListItem[],
  sourceAssetIds: string[]
): BookmarkSummarySource[] {
  const requested = new Set(sourceAssetIds)
  return bookmarks
    .filter((bookmark) => requested.has(bookmark.id))
    .map((bookmark) => ({
      id: bookmark.id,
      title: bookmark.title,
      url: bookmark.url,
      createdAt: bookmark.createdAt,
    }))
}

function normalizeBookmarkSummaryOutput(
  output: BookmarkSummaryOutput,
  bookmarks: AssetListItem[]
): BookmarkSummaryResult {
  const validIds = new Set(bookmarks.map((bookmark) => bookmark.id))
  const sourceAssetIds = output.sourceAssetIds.filter((id) => validIds.has(id))
  const fallbackIds = bookmarks.slice(0, 5).map((bookmark) => bookmark.id)
  const finalSourceIds = sourceAssetIds.length ? sourceAssetIds : fallbackIds

  return {
    headline: output.headline,
    summary: output.summary,
    keyPoints: output.keyPoints,
    sourceAssetIds: finalSourceIds,
    sources: mapSummarySources(bookmarks, finalSourceIds),
    generatedAt: new Date(),
  }
}

const BOOKMARK_SUMMARY_SYSTEM_PROMPT = `You generate a short Chinese summary for a user's recent saved bookmarks.

Rules:
- Use only the provided bookmark records.
- Use only saved text and URL. Do not claim to have read the linked pages.
- Do not invent page titles, page contents, facts, projects, deadlines, or context.
- Keep the tone concise and practical.
- Return sourceAssetIds that refer only to provided bookmark ids.
- If there are no bookmarks, say there is nothing to summarize.`

export async function summarizeRecentBookmarks(
  userId: string
): Promise<BookmarkSummaryResult> {
  const bookmarks = await listLinkAssets(userId, BOOKMARK_SUMMARY_LIMIT)

  if (bookmarks.length === 0) {
    return normalizeBookmarkSummaryOutput(getFallbackBookmarkSummary(bookmarks), bookmarks)
  }

  const model = getAiProvider()
  if (!model) {
    return normalizeBookmarkSummaryOutput(getFallbackBookmarkSummary(bookmarks), bookmarks)
  }

  try {
    const result = await generateText({
      model,
      output: Output.object({ schema: bookmarkSummaryOutputSchema }),
      system: BOOKMARK_SUMMARY_SYSTEM_PROMPT,
      prompt: JSON.stringify({
        currentTime: new Date().toISOString(),
        bookmarks: buildBookmarkSummaryPromptInput(bookmarks),
      }),
      temperature: 0,
      maxRetries: 1,
      timeout: BOOKMARK_SUMMARY_MODEL_TIMEOUT_MS,
      providerOptions: {
        alibaba: {
          enableThinking: false,
        },
      },
    })

    return normalizeBookmarkSummaryOutput(result.output, bookmarks)
  } catch (error) {
    console.warn('[assets.bookmark-summary] AI summary failed; using fallback', {
      error: error instanceof Error ? error.message : String(error),
    })
    return normalizeBookmarkSummaryOutput(getFallbackBookmarkSummary(bookmarks), bookmarks)
  }
}