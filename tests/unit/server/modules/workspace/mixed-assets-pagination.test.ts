import { describe, expect, it } from 'vitest'

import {
  createMixedWorkspaceAssetsPage,
  decodeMixedWorkspaceAssetsCursor,
} from '@/server/modules/workspace/mixed-assets-pagination'

import type { AssetListItem } from '@/shared/assets/assets.types'

function createAsset(id: string, type: AssetListItem['type'], createdAt: string): AssetListItem {
  return {
    id,
    type,
    title: id,
    originalText: id,
    excerpt: id,
    content: null,
    note: null,
    summary: null,
    url: null,
    timeText: null,
    dueAt: null,
    completed: false,
    bookmarkMeta: null,
    lifecycleStatus: 'active',
    archivedAt: null,
    trashedAt: null,
    createdAt: new Date(createdAt),
    updatedAt: new Date(createdAt),
  }
}

describe('mixed workspace assets pagination', () => {
  it('advances per-type cursors only for returned asset types', () => {
    const page = createMixedWorkspaceAssetsPage({
      pageSize: 2,
      incomingCursor: null,
      notesPage: {
        items: [
          createAsset('note_1', 'note', '2026-04-23T10:00:00.000Z'),
          createAsset('note_2', 'note', '2026-04-23T09:00:00.000Z'),
        ],
        pageInfo: { pageSize: 2, nextCursor: 'next_notes', hasNextPage: true },
      },
      bookmarksPage: {
        items: [createAsset('bookmark_1', 'link', '2026-04-23T08:00:00.000Z')],
        pageInfo: { pageSize: 2, nextCursor: null, hasNextPage: false },
      },
      todosPage: {
        items: [createAsset('todo_1', 'todo', '2026-04-23T07:00:00.000Z')],
        pageInfo: { pageSize: 2, nextCursor: null, hasNextPage: false },
      },
    })

    expect(page.items.map((item) => item.id)).toEqual(['note_1', 'note_2'])
    expect(page.pageInfo.hasNextPage).toBe(true)

    const cursor = decodeMixedWorkspaceAssetsCursor(page.pageInfo.nextCursor)
    expect(cursor).toMatchObject({
      kind: 'mixed-workspace-assets',
      notesCursor: expect.any(String),
      bookmarksCursor: null,
      todosCursor: null,
    })
  })

  it('keeps unreturned types available on the next page', () => {
    const firstPage = createMixedWorkspaceAssetsPage({
      pageSize: 2,
      incomingCursor: null,
      notesPage: {
        items: [
          createAsset('note_1', 'note', '2026-04-23T10:00:00.000Z'),
          createAsset('note_2', 'note', '2026-04-23T09:00:00.000Z'),
        ],
        pageInfo: { pageSize: 2, nextCursor: 'next_notes', hasNextPage: true },
      },
      bookmarksPage: {
        items: [createAsset('bookmark_1', 'link', '2026-04-23T08:30:00.000Z')],
        pageInfo: { pageSize: 2, nextCursor: null, hasNextPage: false },
      },
      todosPage: {
        items: [createAsset('todo_1', 'todo', '2026-04-23T08:00:00.000Z')],
        pageInfo: { pageSize: 2, nextCursor: null, hasNextPage: false },
      },
    })

    const secondPage = createMixedWorkspaceAssetsPage({
      pageSize: 2,
      incomingCursor: decodeMixedWorkspaceAssetsCursor(firstPage.pageInfo.nextCursor),
      notesPage: {
        items: [],
        pageInfo: { pageSize: 2, nextCursor: null, hasNextPage: false },
      },
      bookmarksPage: {
        items: [createAsset('bookmark_1', 'link', '2026-04-23T08:30:00.000Z')],
        pageInfo: { pageSize: 2, nextCursor: null, hasNextPage: false },
      },
      todosPage: {
        items: [createAsset('todo_1', 'todo', '2026-04-23T08:00:00.000Z')],
        pageInfo: { pageSize: 2, nextCursor: null, hasNextPage: false },
      },
    })

    expect(secondPage.items.map((item) => item.id)).toEqual(['bookmark_1', 'todo_1'])
    expect(secondPage.pageInfo.hasNextPage).toBe(false)
  })
})
