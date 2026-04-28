import 'server-only'

import { z } from 'zod'

import { buildWorkspaceSystemPrompt, runAiGeneration } from '@/server/lib/ai'
import { writeBookmarkEnrichResult } from '@/server/services/bookmark/bookmark-enrich.service'
import { dequeueBookmarkEnrichTask } from '@/server/services/bookmark/bookmark-queue.service'
import { checkUrlSafety } from '@/server/services/bookmark/url-safety'

import { BaseWorker } from './base.worker'

import type { BookmarkEnrichResult, BookmarkEnrichTask } from '@/server/services/bookmark/bookmark-enrich.contract'
import type { BookmarkEnrichedType } from '@/shared/assets/bookmark-meta.types'

type ReservedBookmarkEnrichTask = {
  task: BookmarkEnrichTask
  acknowledge: () => Promise<void>
  release: () => Promise<void>
}

const BOOKMARK_ENRICH_FETCH_TIMEOUT_MS = 8_000
const BOOKMARK_ENRICH_MAX_INPUT_LENGTH = 8_000
const BOOKMARK_ENRICH_MAX_HTML_BYTES = 256 * 1024
const BOOKMARK_ENRICH_MAX_REDIRECTS = 3
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

  const systemPrompt = await buildWorkspaceSystemPrompt('bookmark/content-summary.system')
  const aiResult = await runAiGeneration({
    schema: bookmarkSummarySchema,
    systemPrompt,
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

async function readHtmlResponse(response: Response): Promise<string | null> {
  const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
  if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
    return null
  }

  const contentLengthHeader = response.headers.get('content-length')
  const contentLength = contentLengthHeader ? Number.parseInt(contentLengthHeader, 10) : Number.NaN
  if (Number.isFinite(contentLength) && contentLength > BOOKMARK_ENRICH_MAX_HTML_BYTES) {
    throw new Error('FETCH_TOO_LARGE')
  }

  const reader = response.body?.getReader()
  if (!reader) {
    const text = await response.text()
    if (new TextEncoder().encode(text).byteLength > BOOKMARK_ENRICH_MAX_HTML_BYTES) {
      throw new Error('FETCH_TOO_LARGE')
    }
    return text
  }

  const decoder = new TextDecoder()
  let totalBytes = 0
  let html = ''

  for (;;) {
    const { done, value } = await reader.read()
    if (done) {
      break
    }

    totalBytes += value.byteLength
    if (totalBytes > BOOKMARK_ENRICH_MAX_HTML_BYTES) {
      await reader.cancel('FETCH_TOO_LARGE')
      throw new Error('FETCH_TOO_LARGE')
    }

    html += decoder.decode(value, { stream: true })
  }

  html += decoder.decode()
  return html
}

async function fetchBookmarkResponse(url: string): Promise<{ response: Response; finalUrl: string }> {
  let currentUrl = url

  for (let redirectCount = 0; redirectCount <= BOOKMARK_ENRICH_MAX_REDIRECTS; redirectCount += 1) {
    const safety = await checkUrlSafety(currentUrl)
    if (!safety.safe) {
      throw new Error(safety.reason === 'private_network' ? 'PRIVATE_URL_BLOCKED' : 'INVALID_URL')
    }

    const response = await fetch(currentUrl, {
      method: 'GET',
      redirect: 'manual',
      signal: AbortSignal.timeout(BOOKMARK_ENRICH_FETCH_TIMEOUT_MS),
      headers: {
        'user-agent': 'gotly-keeper-bookmark-bot/1.0',
      },
    })

    if (response.status < 300 || response.status >= 400) {
      return { response, finalUrl: currentUrl }
    }

    const location = response.headers.get('location')
    if (!location) {
      throw new Error('REDIRECT_LOCATION_MISSING')
    }

    currentUrl = new URL(location, currentUrl).toString()
  }

  throw new Error('TOO_MANY_REDIRECTS')
}

export async function runBookmarkEnrichWorker(task: BookmarkEnrichTask): Promise<BookmarkEnrichResult> {
  try {
    const { response, finalUrl } = await fetchBookmarkResponse(task.url)

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

    const html = await readHtmlResponse(response)
    if (!html) {
      return {
        taskId: task.taskId,
        bookmarkId: task.bookmarkId,
        success: false,
        error: {
          code: 'UNSUPPORTED_CONTENT_TYPE',
          message: 'response is not an html document',
          retryable: false,
        },
      }
    }

    const metadata = extractMetadata(finalUrl, html)
    const readableText = extractReadableText(html, metadata.description)
    const bookmarkType = classifyBookmarkType(finalUrl, html)
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
        code:
          error instanceof Error &&
          (error.message === 'FETCH_TOO_LARGE' ||
            error.message === 'PRIVATE_URL_BLOCKED' ||
            error.message === 'INVALID_URL' ||
            error.message === 'TOO_MANY_REDIRECTS' ||
            error.message === 'REDIRECT_LOCATION_MISSING')
            ? error.message
            : 'ENRICH_FAILED',
        message: error instanceof Error ? error.message : String(error),
        retryable: false,
      },
    }
  }
}

export class BookmarkEnrichWorker extends BaseWorker<ReservedBookmarkEnrichTask> {
  constructor() {
    super('bookmark-enrich')
  }

  protected async dequeueTask(): Promise<ReservedBookmarkEnrichTask | null> {
    return dequeueBookmarkEnrichTask(5)
  }

  protected async handleTask(reservedTask: ReservedBookmarkEnrichTask): Promise<void> {
    const result = await runBookmarkEnrichWorker(reservedTask.task)
    await writeBookmarkEnrichResult({
      userId: reservedTask.task.userId,
      bookmarkId: reservedTask.task.bookmarkId,
      result,
    })
    await reservedTask.acknowledge()
  }

  protected async onError(error: unknown, reservedTask: ReservedBookmarkEnrichTask | null): Promise<void> {
    if (reservedTask) {
      await reservedTask.release()
    }

    await super.onError(error, reservedTask)
  }
}
