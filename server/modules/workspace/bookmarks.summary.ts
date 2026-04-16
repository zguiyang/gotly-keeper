import 'server-only'

import { generateText, Output } from 'ai'
import { z } from 'zod'

import { renderPrompt } from '@/server/lib/prompt-template'
import { listBookmarks } from '@/server/services/bookmarks'
import { nowIso, dayjs } from '@/shared/time/dayjs'

import { getAiProvider } from '../../lib/ai/ai-provider'
import { BOOKMARK_SUMMARY_LIMIT, BOOKMARK_SUMMARY_MODEL_TIMEOUT_MS } from '../../lib/config/constants'

import type { AssetListItem, BookmarkSummaryResult, BookmarkSummarySource } from '@/shared/assets/assets.types'
import type { BookmarkListItem } from '@/server/services/bookmarks'

type BookmarkSummaryPromptItem = {
  id: string
  text: string
  url: string | null
  createdAt: string
}

function toAssetListItem(bookmark: BookmarkListItem): AssetListItem {
  return {
    id: bookmark.id,
    originalText: bookmark.originalText,
    title: bookmark.title,
    excerpt: bookmark.excerpt,
    type: 'link',
    url: bookmark.url,
    timeText: null,
    dueAt: null,
    completed: false,
    bookmarkMeta: bookmark.bookmarkMeta,
    createdAt: bookmark.createdAt,
  }
}

export function buildBookmarkSummaryPromptInput(
  bookmarks: AssetListItem[]
): BookmarkSummaryPromptItem[] {
  return bookmarks.slice(0, BOOKMARK_SUMMARY_LIMIT).map((bookmark) => ({
    id: bookmark.id,
    text: bookmark.originalText,
    url: bookmark.url,
    createdAt: dayjs(bookmark.createdAt).toISOString(),
  }))
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
  const filteredSourceIds = output.sourceAssetIds.filter((id) => validIds.has(id))
  const fallbackIds = bookmarks.slice(0, 5).map((bookmark) => bookmark.id)
  const finalSourceIds = filteredSourceIds.length ? filteredSourceIds : fallbackIds

  return {
    headline: output.headline,
    summary: output.summary,
    keyPoints: output.keyPoints,
    sourceAssetIds: finalSourceIds,
    sources: mapSummarySources(bookmarks, finalSourceIds),
    generatedAt: dayjs().toDate(),
  }
}

export async function summarizeWorkspaceRecentBookmarksInternal(
  userId: string
): Promise<BookmarkSummaryResult> {
  const bookmarkItems = await listBookmarks({ userId, limit: BOOKMARK_SUMMARY_LIMIT })
  const bookmarks = bookmarkItems.map(toAssetListItem)

  if (bookmarks.length === 0) {
    return normalizeBookmarkSummaryOutput(getFallbackBookmarkSummary(bookmarks), bookmarks)
  }

  const model = getAiProvider()
  if (!model) {
    return normalizeBookmarkSummaryOutput(getFallbackBookmarkSummary(bookmarks), bookmarks)
  }

  try {
    const [systemPrompt, userPrompt] = await Promise.all([
      renderPrompt('workspace/bookmark-summary.system', {}),
      renderPrompt('workspace/bookmark-summary.user', {
        payloadJson: JSON.stringify({
          currentTime: nowIso(),
          bookmarks: buildBookmarkSummaryPromptInput(bookmarks),
        }),
      }),
    ])

    const result = await generateText({
      model,
      output: Output.object({ schema: bookmarkSummaryOutputSchema }),
      system: systemPrompt,
      prompt: userPrompt,
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
    console.warn('[bookmarks.summary] AI summary failed; using fallback', {
      error: error instanceof Error ? error.message : String(error),
    })
    return normalizeBookmarkSummaryOutput(getFallbackBookmarkSummary(bookmarks), bookmarks)
  }
}
