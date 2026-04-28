import 'server-only'

import { updateBookmarkEnrichment } from '@/server/services/bookmarks'
import { BOOKMARK_META_STATUS, type BookmarkMeta } from '@/shared/assets/bookmark-meta.types'
import { nowIso } from '@/shared/time/dayjs'

import { enqueueBookmarkEnrichTask } from './bookmark-queue.service'
import { checkUrlSafety } from './url-safety'

import type { BookmarkEnrichResult, BookmarkEnrichTask } from './bookmark-enrich.contract'

function createPendingBookmarkMeta(): BookmarkMeta {
  return {
    status: BOOKMARK_META_STATUS.PENDING,
    title: null,
    icon: null,
    bookmarkType: null,
    description: null,
    contentSummary: null,
    errorCode: null,
    errorMessage: null,
    updatedAt: nowIso(),
  }
}

function createSkippedPrivateUrlMeta(): BookmarkMeta {
  return {
    status: BOOKMARK_META_STATUS.SKIPPED_PRIVATE_URL,
    title: null,
    icon: null,
    bookmarkType: null,
    description: null,
    contentSummary: null,
    errorCode: 'PRIVATE_URL_BLOCKED',
    errorMessage: 'private or intranet url is blocked',
    updatedAt: nowIso(),
  }
}

function createFailedBookmarkMeta(errorCode: string, errorMessage: string): BookmarkMeta {
  return {
    status: BOOKMARK_META_STATUS.FAILED,
    title: null,
    icon: null,
    bookmarkType: null,
    description: null,
    contentSummary: null,
    errorCode,
    errorMessage,
    updatedAt: nowIso(),
  }
}

function createSuccessBookmarkMeta(result: NonNullable<BookmarkEnrichResult['data']>): BookmarkMeta {
  return {
    status: BOOKMARK_META_STATUS.SUCCESS,
    title: result.title,
    icon: result.icon,
    bookmarkType: result.bookmarkType,
    description: result.description,
    contentSummary: result.contentSummary,
    errorCode: null,
    errorMessage: null,
    updatedAt: nowIso(),
  }
}

function createBookmarkEnrichTask(input: {
  bookmarkId: string
  userId: string
  url: string
}): BookmarkEnrichTask {
  return {
    taskId: crypto.randomUUID(),
    bookmarkId: input.bookmarkId,
    userId: input.userId,
    url: input.url,
    traceId: crypto.randomUUID(),
    createdAt: nowIso(),
  }
}

export function buildPendingBookmarkMetaForResponse(): BookmarkMeta {
  return createPendingBookmarkMeta()
}

export async function scheduleBookmarkEnrichTask(input: {
  bookmarkId: string
  userId: string
  url: string
}): Promise<void> {
  try {
    await updateBookmarkEnrichment({
      bookmarkId: input.bookmarkId,
      userId: input.userId,
      bookmarkMeta: createPendingBookmarkMeta(),
    })

    const safety = await checkUrlSafety(input.url)
    if (!safety.safe) {
      const errorMeta =
        safety.reason === 'private_network'
          ? createSkippedPrivateUrlMeta()
          : createFailedBookmarkMeta('INVALID_URL', safety.reason)

      await updateBookmarkEnrichment({
        bookmarkId: input.bookmarkId,
        userId: input.userId,
        bookmarkMeta: errorMeta,
      })
      return
    }

    const task = createBookmarkEnrichTask(input)
    await enqueueBookmarkEnrichTask(task)
  } catch (error) {
    await updateBookmarkEnrichment({
      bookmarkId: input.bookmarkId,
      userId: input.userId,
      bookmarkMeta: createFailedBookmarkMeta(
        'ENQUEUE_FAILED',
        error instanceof Error ? error.message : String(error)
      ),
    })
  }
}

export async function writeBookmarkEnrichResult(input: {
  userId: string
  bookmarkId: string
  result: BookmarkEnrichResult
}): Promise<void> {
  const bookmarkMeta = input.result.success && input.result.data
    ? createSuccessBookmarkMeta(input.result.data)
    : createFailedBookmarkMeta(
        input.result.error?.code ?? 'UNKNOWN_ERROR',
        input.result.error?.message ?? 'unknown worker failure'
      )

  await updateBookmarkEnrichment({
    bookmarkId: input.bookmarkId,
    userId: input.userId,
    bookmarkMeta,
  })
}
