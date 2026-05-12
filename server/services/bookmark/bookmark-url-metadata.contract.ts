import type { UrlMetadataTask, UrlMetadataTaskResult } from '@/server/lib/metadata/url-metadata-task.contract'

export type BookmarkUrlMetadataTask = {
  bookmarkId: string
  userId: string
  metadataTask: UrlMetadataTask
}

export type BookmarkUrlMetadataResult = UrlMetadataTaskResult
