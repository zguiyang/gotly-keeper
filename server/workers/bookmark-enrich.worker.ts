import 'server-only'

import { z } from 'zod'

import { runAiGeneration } from '@/server/lib/ai'
import { writeBookmarkEnrichResult } from '@/server/modules/workspace/bookmark-enrich.module'
import { dequeueBookmarkEnrichTask } from '@/server/services/bookmark/bookmark-queue.service'

import type { BookmarkEnrichResult, BookmarkEnrichTask } from '@/server/services/bookmark/bookmark-enrich.contract'
import type { BookmarkEnrichedType } from '@/shared/assets/bookmark-meta.types'
import { BaseWorker } from './base.worker'

const BOOKMARK_ENRICH_FETCH_TIMEOUT_MS = 8_000
const BOOKMARK_ENRICH_MAX_INPUT_LENGTH = 8_000
const BOOKMARK_ENRICH_SUMMARY_TIMEOUT_MS = 8_000

const bookmarkSummarySchema = z.object({
  contentSummary: z.string().trim().min(1).max(220),
})

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function matchFirstGroup(pattern: RegExp, text: string): string | null {
  const matched = pattern.exec(text)
  if (!matched || !matched[1]) {
    return null
  }

  return decodeHtmlEntities(matched[1].trim()) || null
}

function resolveUrl(baseUrl: string, maybeRelativeUrl: string | null): string | null {
  if (!maybeRelativeUrl) {
    return null
  }

  try {
    return new URL(maybeRelativeUrl, baseUrl).toString()
  } catch {
    return null
  }
}

function extractMetadata(url: string, html: string) {
  const title =
    matchFirstGroup(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["'][^>]*>/i, html) ??
    matchFirstGroup(/<title[^>]*>([\s\S]*?)<\/title>/i, html)
  const description =
    matchFirstGroup(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i, html) ??
    matchFirstGroup(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["'][^>]*>/i, html)
  const iconHref = matchFirstGroup(
    /<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]+href=["']([^"']+)["'][^>]*>/i,
    html
  )
  const icon = resolveUrl(url, iconHref)

  return { title, description, icon }
}

function extractReadableText(html: string, description: string | null): string {
  const text = stripHtml(html)
  if (text.length >= 120) {
    return text
  }
  return description || text
}

function classifyBookmarkType(urlText: string, html: string): BookmarkEnrichedType {
  const lower = `${urlText} ${html}`.toLowerCase()

  if (
    lower.includes('youtube.com') ||
    lower.includes('youtu.be') ||
    lower.includes('bilibili.com') ||
    lower.includes('vimeo.com') ||
    lower.includes('og:type" content="video')
  ) {
    return 'video'
  }

  if (
    lower.includes('/docs') ||
    lower.includes('docs.') ||
    lower.includes('readthedocs') ||
    lower.includes('developer.')
  ) {
    return 'docs'
  }

  if (
    lower.includes('github.com') ||
    lower.includes('figma.com') ||
    lower.includes('notion.so') ||
    lower.includes('slack.com')
  ) {
    return 'tool'
  }

  if (
    lower.includes('/blog') ||
    lower.includes('/article') ||
    lower.includes('/post') ||
    lower.includes('og:type" content="article')
  ) {
    return 'article'
  }

  return 'other'
}

function clampSummarySource(text: string): string {
  if (text.length <= BOOKMARK_ENRICH_MAX_INPUT_LENGTH) {
    return text
  }
  return text.slice(0, BOOKMARK_ENRICH_MAX_INPUT_LENGTH)
}

async function generateContentSummary(
  title: string | null,
  description: string | null,
  readableText: string
): Promise<string | null> {
  const source = clampSummarySource(readableText)
  if (!source.trim()) {
    return description
  }

  const aiResult = await runAiGeneration({
    schema: bookmarkSummarySchema,
    systemPrompt:
      '你是网页摘要助手。请基于输入生成2-4句中文摘要，不要编造，不要加入列表符号或标题。',
    userPrompt: JSON.stringify({
      title,
      description,
      content: source,
    }),
    timeoutMs: BOOKMARK_ENRICH_SUMMARY_TIMEOUT_MS,
    maxRetries: 1,
  })

  if (aiResult.success) {
    return aiResult.data.contentSummary
  }

  return description ?? source.slice(0, 180)
}

export async function runBookmarkEnrichWorker(task: BookmarkEnrichTask): Promise<BookmarkEnrichResult> {
  try {
    const response = await fetch(task.url, {
      method: 'GET',
      signal: AbortSignal.timeout(BOOKMARK_ENRICH_FETCH_TIMEOUT_MS),
      headers: {
        'user-agent': 'gotly-ai-bookmark-bot/1.0',
      },
    })

    if (!response.ok) {
      return {
        taskId: task.taskId,
        bookmarkId: task.bookmarkId,
        success: false,
        error: {
          code: 'FETCH_HTTP_ERROR',
          message: `failed to fetch page with status ${response.status}`,
          retryable: false,
        },
      }
    }

    const html = await response.text()
    const metadata = extractMetadata(task.url, html)
    const readableText = extractReadableText(html, metadata.description)
    const bookmarkType = classifyBookmarkType(task.url, html)
    const contentSummary = await generateContentSummary(
      metadata.title,
      metadata.description,
      readableText
    )

    return {
      taskId: task.taskId,
      bookmarkId: task.bookmarkId,
      success: true,
      data: {
        title: metadata.title,
        icon: metadata.icon,
        bookmarkType,
        description: metadata.description,
        contentSummary,
      },
    }
  } catch (error) {
    return {
      taskId: task.taskId,
      bookmarkId: task.bookmarkId,
      success: false,
      error: {
        code: 'ENRICH_FAILED',
        message: error instanceof Error ? error.message : String(error),
        retryable: false,
      },
    }
  }
}

export class BookmarkEnrichWorker extends BaseWorker<BookmarkEnrichTask> {
  constructor() {
    super('bookmark-enrich')
  }

  protected async dequeueTask(): Promise<BookmarkEnrichTask | null> {
    return dequeueBookmarkEnrichTask(5)
  }

  protected async handleTask(task: BookmarkEnrichTask): Promise<void> {
    const result = await runBookmarkEnrichWorker(task)
    await writeBookmarkEnrichResult({
      userId: task.userId,
      bookmarkId: task.bookmarkId,
      result,
    })
  }
}
