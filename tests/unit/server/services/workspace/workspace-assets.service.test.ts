import { beforeEach, describe, expect, it, vi } from 'vitest'

const notesMock = vi.hoisted(() => ({
  findDuplicateNotes: vi.fn(),
  listNotes: vi.fn(),
  updateNote: vi.fn(),
}))

const todosMock = vi.hoisted(() => ({
  findDuplicateTodos: vi.fn(),
  listTodos: vi.fn(),
}))

const bookmarksMock = vi.hoisted(() => ({
  findDuplicateBookmarks: vi.fn(),
  listBookmarks: vi.fn(),
  updateBookmark: vi.fn(),
}))

const searchEmbeddingsMock = vi.hoisted(() => ({
  deleteEmbeddingsForAsset: vi.fn(),
}))

const bookmarkEnrichMock = vi.hoisted(() => ({
  buildPendingBookmarkMetaForResponse: vi.fn(),
  scheduleBookmarkEnrichTask: vi.fn(),
}))

function buildNoteAsset(overrides: Record<string, unknown> = {}) {
  return {
    id: 'note_1',
    originalText: '会议纪要',
    title: '会议纪要',
    excerpt: '会议纪要',
    content: '内容',
    summary: '摘要',
    lifecycleStatus: 'active',
    archivedAt: null,
    trashedAt: null,
    createdAt: new Date('2026-05-01T00:00:00.000Z'),
    updatedAt: new Date('2026-05-01T00:00:00.000Z'),
    ...overrides,
  }
}

function buildBookmarkAsset(overrides: Record<string, unknown> = {}) {
  return {
    id: 'link_1',
    originalText: 'https://example.com',
    title: 'Example',
    excerpt: 'Example',
    note: null,
    summary: '书签摘要',
    url: 'https://example.com',
    bookmarkMeta: null,
    lifecycleStatus: 'active',
    archivedAt: null,
    trashedAt: null,
    createdAt: new Date('2026-05-01T00:00:00.000Z'),
    updatedAt: new Date('2026-05-01T00:00:00.000Z'),
    ...overrides,
  }
}

function buildTodoAsset(overrides: Record<string, unknown> = {}) {
  return {
    id: 'todo_1',
    originalText: '今天发报价',
    title: '发报价',
    excerpt: '今天发报价',
    content: null,
    timeText: null,
    dueAt: null,
    completed: false,
    lifecycleStatus: 'active',
    archivedAt: null,
    trashedAt: null,
    createdAt: new Date('2026-05-02T00:00:00.000Z'),
    updatedAt: new Date('2026-05-02T00:00:00.000Z'),
    ...overrides,
  }
}

vi.mock('@/server/services/notes', () => ({
  findDuplicateNotes: notesMock.findDuplicateNotes,
  listNotes: notesMock.listNotes,
  updateNote: notesMock.updateNote,
}))

vi.mock('@/server/services/todos', () => ({
  findDuplicateTodos: todosMock.findDuplicateTodos,
  listTodos: todosMock.listTodos,
}))

vi.mock('@/server/services/bookmarks', () => ({
  findDuplicateBookmarks: bookmarksMock.findDuplicateBookmarks,
  listBookmarks: bookmarksMock.listBookmarks,
  updateBookmark: bookmarksMock.updateBookmark,
}))

vi.mock('@/server/services/search/semantic-search.service', () => searchEmbeddingsMock)

vi.mock('@/server/services/bookmark/bookmark-enrich.service', () => bookmarkEnrichMock)

const {
  findWorkspaceCreateDuplicates,
  listWorkspaceAssets,
  updateWorkspaceLinkAsset,
  updateWorkspaceNoteAsset,
} = await import('@/server/services/workspace/workspace-assets.service')

describe('workspace-assets service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('finds bookmark duplicates by exact url', async () => {
    bookmarksMock.findDuplicateBookmarks.mockResolvedValue([
      {
        id: 'bookmark_1',
        originalText: 'https://openai.com',
        title: 'OpenAI',
        excerpt: 'OpenAI',
        type: 'link',
        url: 'https://openai.com',
        createdAt: new Date('2026-04-27T00:00:00.000Z'),
      },
    ])

    const result = await findWorkspaceCreateDuplicates({
      userId: 'user_1',
      steps: [
        {
          stepId: 'step_1',
          action: 'create_bookmark',
          target: 'bookmarks',
          title: 'OpenAI',
          url: 'https://openai.com',
        },
      ],
    })

    expect(result).toEqual([
      {
        stepId: 'step_1',
        target: 'bookmark',
        duplicates: [
          {
            id: 'bookmark_1',
            label: 'OpenAI',
            reason: expect.stringContaining('URL'),
          },
        ],
      },
    ])
  })

  it('listWorkspaceAssets routes typed note lists through the note adapter', async () => {
    notesMock.listNotes.mockResolvedValue([buildNoteAsset()])

    const result = await listWorkspaceAssets({
      userId: 'user_1',
      type: 'note',
      limit: 20,
    })

    expect(notesMock.listNotes).toHaveBeenCalledWith({
      userId: 'user_1',
      limit: 20,
      lifecycleStatus: 'active',
    })
    expect(bookmarksMock.listBookmarks).not.toHaveBeenCalled()
    expect(todosMock.listTodos).not.toHaveBeenCalled()
    expect(result).toMatchObject([{ id: 'note_1', type: 'note', summary: '摘要' }])
  })

  it('listWorkspaceAssets keeps mixed sorting and limit behavior unchanged', async () => {
    notesMock.listNotes.mockResolvedValue([
      buildNoteAsset({
        originalText: '昨天的复盘',
        title: '复盘',
        excerpt: '昨天的复盘',
      }),
    ])
    bookmarksMock.listBookmarks.mockResolvedValue([
      buildBookmarkAsset({
        createdAt: new Date('2026-05-03T00:00:00.000Z'),
        updatedAt: new Date('2026-05-03T00:00:00.000Z'),
      }),
    ])
    todosMock.listTodos.mockResolvedValue([buildTodoAsset()])

    const result = await listWorkspaceAssets({
      userId: 'user_1',
      limit: 2,
    })

    expect(notesMock.listNotes).toHaveBeenCalledWith({
      userId: 'user_1',
      limit: 2,
      lifecycleStatus: 'active',
    })
    expect(bookmarksMock.listBookmarks).toHaveBeenCalledWith({
      userId: 'user_1',
      limit: 2,
      lifecycleStatus: 'active',
    })
    expect(todosMock.listTodos).toHaveBeenCalledWith({
      userId: 'user_1',
      limit: 2,
      lifecycleStatus: 'active',
    })
    expect(result).toMatchObject([
      { id: 'link_1', type: 'link' },
      { id: 'todo_1', type: 'todo' },
    ])
  })

  it('updateWorkspaceNoteAsset clears note embeddings and returns mapped asset', async () => {
    notesMock.updateNote.mockResolvedValue(
      buildNoteAsset({
        originalText: '更新后的正文',
        title: '新标题',
        excerpt: '更新后的正文',
        content: '新内容',
        summary: '新摘要',
        updatedAt: new Date('2026-05-02T00:00:00.000Z'),
      })
    )

    const result = await updateWorkspaceNoteAsset({
      userId: 'user_1',
      assetId: 'note_1',
      rawInput: '更新后的正文',
      title: '新标题',
      content: '新内容',
      summary: '新摘要',
    })

    expect(notesMock.updateNote).toHaveBeenCalledWith({
      userId: 'user_1',
      noteId: 'note_1',
      rawInput: '更新后的正文',
      title: '新标题',
      content: '新内容',
      summary: '新摘要',
    })
    expect(searchEmbeddingsMock.deleteEmbeddingsForAsset).toHaveBeenCalledWith({
      assetType: 'note',
      assetId: 'note_1',
    })
    expect(result).toMatchObject({
      id: 'note_1',
      type: 'note',
      summary: '新摘要',
    })
  })

  it('updateWorkspaceLinkAsset reschedules enrich when url changes', async () => {
    bookmarksMock.updateBookmark.mockResolvedValue({
      urlChanged: true,
      item: buildBookmarkAsset({
        originalText: '收藏更新',
        note: '备注',
        summary: '摘要',
        url: 'https://example.com/new',
        updatedAt: new Date('2026-05-02T00:00:00.000Z'),
      }),
    })

    const result = await updateWorkspaceLinkAsset({
      userId: 'user_1',
      assetId: 'link_1',
      rawInput: '收藏更新',
      url: 'https://example.com/new',
      title: 'Example',
      note: '备注',
      summary: '摘要',
    })

    expect(bookmarksMock.updateBookmark).toHaveBeenCalledWith({
      userId: 'user_1',
      bookmarkId: 'link_1',
      rawInput: '收藏更新',
      url: 'https://example.com/new',
      title: 'Example',
      note: '备注',
      summary: '摘要',
    })
    expect(searchEmbeddingsMock.deleteEmbeddingsForAsset).toHaveBeenCalledWith({
      assetType: 'link',
      assetId: 'link_1',
    })
    expect(bookmarkEnrichMock.scheduleBookmarkEnrichTask).toHaveBeenCalledWith({
      bookmarkId: 'link_1',
      userId: 'user_1',
      url: 'https://example.com/new',
    })
    expect(result).toMatchObject({
      id: 'link_1',
      type: 'link',
      url: 'https://example.com/new',
    })
  })
})
