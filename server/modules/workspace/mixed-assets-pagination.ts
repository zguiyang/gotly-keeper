import 'server-only'

import { decodeCursor, encodeCursor } from '@/server/services/pagination'

import type { AssetListItem } from '@/shared/assets/assets.types'
import type { PaginatedResult } from '@/shared/pagination'

type AssetCursor = {
  createdAt: string
  id: string
}

export type MixedWorkspaceAssetsCursor = {
  kind: 'mixed-workspace-assets'
  notesCursor: string | null
  bookmarksCursor: string | null
  todosCursor: string | null
}

type MixedWorkspaceAssetsPageInput = {
  pageSize: number
  incomingCursor: MixedWorkspaceAssetsCursor | null
  notesPage: PaginatedResult<AssetListItem>
  bookmarksPage: PaginatedResult<AssetListItem>
  todosPage: PaginatedResult<AssetListItem>
}

function encodeAssetCursor(item: AssetListItem) {
  return encodeCursor<AssetCursor>({
    createdAt: item.createdAt.toISOString(),
    id: item.id,
  })
}

function isMixedWorkspaceAssetsCursor(value: unknown): value is MixedWorkspaceAssetsCursor {
  return (
    !!value &&
    typeof value === 'object' &&
    'kind' in value &&
    value.kind === 'mixed-workspace-assets' &&
    'notesCursor' in value &&
    'bookmarksCursor' in value &&
    'todosCursor' in value
  )
}

export function decodeMixedWorkspaceAssetsCursor(cursor: string | null | undefined): MixedWorkspaceAssetsCursor | null {
  if (!cursor) {
    return null
  }

  const decoded = decodeCursor(cursor)
  if (!isMixedWorkspaceAssetsCursor(decoded)) {
    throw new Error('INVALID_CURSOR')
  }

  return decoded
}

function compareWorkspaceAssetsDesc(left: AssetListItem, right: AssetListItem): number {
  const createdAtDiff = right.createdAt.getTime() - left.createdAt.getTime()
  if (createdAtDiff !== 0) {
    return createdAtDiff
  }

  return right.id.localeCompare(left.id)
}

function resolveCursorForType(
  assetType: AssetListItem['type'],
  pageItems: AssetListItem[],
  incomingCursor: string | null
) {
  const consumed = pageItems.filter((item) => item.type === assetType)
  if (consumed.length === 0) {
    return incomingCursor
  }

  return encodeAssetCursor(consumed[consumed.length - 1])
}

export function createMixedWorkspaceAssetsPage(
  input: MixedWorkspaceAssetsPageInput
): PaginatedResult<AssetListItem> {
  const merged = [
    ...input.notesPage.items,
    ...input.bookmarksPage.items,
    ...input.todosPage.items,
  ].sort(compareWorkspaceAssetsDesc)

  const hasBufferedItems = merged.length > input.pageSize
  const items = hasBufferedItems ? merged.slice(0, input.pageSize) : merged
  const incomingCursor = input.incomingCursor

  const nextCursorPayload: MixedWorkspaceAssetsCursor = {
    kind: 'mixed-workspace-assets',
    notesCursor: resolveCursorForType('note', items, incomingCursor?.notesCursor ?? null),
    bookmarksCursor: resolveCursorForType('link', items, incomingCursor?.bookmarksCursor ?? null),
    todosCursor: resolveCursorForType('todo', items, incomingCursor?.todosCursor ?? null),
  }

  const hasNextPage =
    hasBufferedItems ||
    input.notesPage.pageInfo.hasNextPage ||
    input.bookmarksPage.pageInfo.hasNextPage ||
    input.todosPage.pageInfo.hasNextPage

  return {
    items,
    pageInfo: {
      pageSize: input.pageSize,
      nextCursor: hasNextPage ? encodeCursor(nextCursorPayload) : null,
      hasNextPage,
    },
  }
}
