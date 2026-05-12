import 'server-only'

import type { UrlMetadataTask } from '@/server/lib/metadata/url-metadata-task.contract'
import { checkUrlSafety } from '@/server/lib/network/url-safety'
import { updateBookmarkEnrichment } from '@/server/services/bookmarks'
import { BOOKMARK_META_STATUS, type BookmarkMeta } from '@/shared/assets/bookmark-meta.types'
import { nowIso } from '@/shared/time/dayjs'

import { enqueueBookmarkUrlMetadataTask } from './bookmark-url-metadata-queue.service'

import type { BookmarkUrlMetadataResult, BookmarkUrlMetadataTask } from './bookmark-url-metadata.contract'

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

function createSuccessBookmarkMeta(result: NonNullable<BookmarkUrlMetadataResult['data']>): BookmarkMeta {
  return {
    status: BOOKMARK_META_STATUS.SUCCESS,
    title: result.title,
    icon: result.icon,
    bookmarkType: null,
    description: result.description,
    contentSummary: null,
    errorCode: null,
    errorMessage: null,
    updatedAt: nowIso(),
  }
}

function createBookmarkUrlMetadataTask(input: {
  bookmarkId: string
  userId: string
  url: string
}): BookmarkUrlMetadataTask {
  return {
    bookmarkId: input.bookmarkId,
    userId: input.userId,
    metadataTask: createUrlMetadataTask(input.url),
  }
}

function createUrlMetadataTask(url: string): UrlMetadataTask {
  return {
    taskId: crypto.randomUUID(),
    url,
    traceId: crypto.randomUUID(),
    createdAt: nowIso(),
  }
}

export function buildPendingBookmarkMetaForResponse(): BookmarkMeta {
  return createPendingBookmarkMeta()
}

export async function scheduleBookmarkUrlMetadataTask(input: {
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

    const task = createBookmarkUrlMetadataTask(input)
    await enqueueBookmarkUrlMetadataTask(task)
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

export async function writeBookmarkUrlMetadataResult(input: {
  userId: string
  bookmarkId: string
  result: BookmarkUrlMetadataResult
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
