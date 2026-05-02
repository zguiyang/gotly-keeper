import { beforeEach, describe, expect, it, vi } from 'vitest'

const notesMock = vi.hoisted(() => ({
  listNotesPage: vi.fn(),
}))

const todosMock = vi.hoisted(() => ({
  archiveTodo: vi.fn(),
  getTodoById: vi.fn(),
  listTodosPage: vi.fn(),
}))

const bookmarksMock = vi.hoisted(() => ({
  getBookmarkById: vi.fn(),
  listBookmarksPage: vi.fn(),
  purgeBookmark: vi.fn(),
}))

const workspaceAssetsServiceMock = vi.hoisted(() => ({
  createWorkspaceLinkAsset: vi.fn(),
  createWorkspaceNoteAsset: vi.fn(),
  createWorkspaceTodoAsset: vi.fn(),
  listWorkspaceAssets: vi.fn(),
  searchWorkspaceAssets: vi.fn(),
  setWorkspaceTodoAssetCompletion: vi.fn(),
  updateWorkspaceLinkAsset: vi.fn(),
  updateWorkspaceNoteAsset: vi.fn(),
  updateWorkspaceTodoAsset: vi.fn(),
  WorkspaceAssetsError: class WorkspaceAssetsError extends Error {
    constructor(publicMessage: string, code = 'ASSET_NOT_FOUND') {
      super(publicMessage)
      this.name = 'WorkspaceAssetsError'
      ;(this as unknown as { publicMessage: string }).publicMessage = publicMessage
      ;(this as unknown as { code: string }).code = code
    }
  },
}))

const workspaceInternalMocks = vi.hoisted(() => ({
  summarizeWorkspaceRecentBookmarksInternal: vi.fn(),
  summarizeWorkspaceRecentNotesInternal: vi.fn(),
  reviewWorkspaceUnfinishedTodosInternal: vi.fn(),
}))

const mixedAssetsPaginationMock = vi.hoisted(() => ({
  createMixedWorkspaceAssetsPage: vi.fn(),
  decodeMixedWorkspaceAssetsCursor: vi.fn(),
}))

function buildTodoAsset(overrides: Record<string, unknown> = {}) {
  return {
    id: 'todo_1',
    originalText: 'follow up',
    title: 'follow up',
    excerpt: 'follow up',
    content: null,
    timeText: null,
    dueAt: null,
    completed: false,
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
    summary: null,
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

function buildNoteAsset(overrides: Record<string, unknown> = {}) {
  return {
    id: 'note_1',
    originalText: 'meeting notes',
    title: 'Meeting',
    excerpt: 'meeting notes',
    content: 'details',
    summary: 'summary',
    lifecycleStatus: 'active',
    archivedAt: null,
    trashedAt: null,
    createdAt: new Date('2026-05-01T00:00:00.000Z'),
    updatedAt: new Date('2026-05-01T00:00:00.000Z'),
    ...overrides,
  }
}

vi.mock('@/server/services/notes', () => notesMock)
vi.mock('@/server/services/todos', () => todosMock)
vi.mock('@/server/services/bookmarks', () => bookmarksMock)

vi.mock('@/server/services/assets/asset-lifecycle', async () => {
  const actual = await vi.importActual('@/server/services/assets/asset-lifecycle')
  return actual
})

vi.mock('@/server/services/bookmark/bookmark-enrich.service', () => ({
  scheduleBookmarkEnrichTask: vi.fn(),
}))

vi.mock('@/server/services/search/semantic-search.service', () => ({
  deleteEmbeddingsForAsset: vi.fn(),
}))

vi.mock('@/server/services/workspace/workspace-assets.service', () => workspaceAssetsServiceMock)

vi.mock('@/server/modules/workspace/bookmarks.summary', () => ({
  summarizeWorkspaceRecentBookmarksInternal:
    workspaceInternalMocks.summarizeWorkspaceRecentBookmarksInternal,
}))

vi.mock('@/server/modules/workspace/notes.summary', () => ({
  summarizeWorkspaceRecentNotesInternal: workspaceInternalMocks.summarizeWorkspaceRecentNotesInternal,
}))

vi.mock('@/server/modules/workspace/todos.review', () => ({
  reviewWorkspaceUnfinishedTodosInternal: workspaceInternalMocks.reviewWorkspaceUnfinishedTodosInternal,
}))

vi.mock('@/server/modules/workspace/mixed-assets-pagination', () => mixedAssetsPaginationMock)

const {
  archiveWorkspaceAsset,
  createWorkspaceAsset,
  createWorkspaceNote,
  listWorkspaceNoteAssets,
  listWorkspaceAssetsPage,
  purgeWorkspaceAsset,
  setWorkspaceTodoCompletion,
  updateWorkspaceBookmark,
  updateWorkspaceNote,
  WorkspaceModuleError,
  WORKSPACE_MODULE_ERROR_CODES,
} = await import('@/server/modules/workspace')

describe('workspace module use cases', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('archiveWorkspaceAsset routes todo assets through todo lifecycle adapter', async () => {
    todosMock.getTodoById.mockResolvedValue(buildTodoAsset())
    todosMock.archiveTodo.mockResolvedValue(
      buildTodoAsset({
        lifecycleStatus: 'archived',
        archivedAt: new Date('2026-05-02T00:00:00.000Z'),
        updatedAt: new Date('2026-05-02T00:00:00.000Z'),
      })
    )

    const result = await archiveWorkspaceAsset({
      userId: 'user_1',
      assetId: 'todo_1',
      assetType: 'todo',
    })

    expect(todosMock.getTodoById).toHaveBeenCalledWith('todo_1', 'user_1', {
      includeLifecycleStatuses: ['active', 'archived', 'trashed'],
    })
    expect(todosMock.archiveTodo).toHaveBeenCalledWith({
      userId: 'user_1',
      todoId: 'todo_1',
    })
    expect(result).toMatchObject({
      id: 'todo_1',
      type: 'todo',
      lifecycleStatus: 'archived',
    })
  })

  it('createWorkspaceNote forwards only the rawInput path to note creation', async () => {
    workspaceAssetsServiceMock.createWorkspaceNoteAsset.mockResolvedValue({
      id: 'note_1',
      type: 'note',
    })

    const result = await createWorkspaceNote({
      userId: 'user_1',
      rawInput: '  需求评审记录  ',
      title: '需求评审',
    })

    expect(workspaceAssetsServiceMock.createWorkspaceNoteAsset).toHaveBeenCalledWith({
      userId: 'user_1',
      rawInput: '  需求评审记录  ',
      title: '需求评审',
      content: null,
      summary: null,
    })
    expect(result).toEqual({
      kind: 'created',
      asset: { id: 'note_1', type: 'note' },
    })
  })

  it('createWorkspaceAsset keeps natural-language classification while delegating through rawInput', async () => {
    workspaceAssetsServiceMock.createWorkspaceLinkAsset.mockResolvedValue({
      id: 'link_1',
      type: 'link',
    })
    workspaceAssetsServiceMock.createWorkspaceTodoAsset.mockResolvedValue({
      id: 'todo_1',
      type: 'todo',
    })
    workspaceAssetsServiceMock.createWorkspaceNoteAsset.mockResolvedValue({
      id: 'note_2',
      type: 'note',
    })

    await expect(
      createWorkspaceAsset({
        userId: 'user_1',
        text: '收藏一下 https://example.com',
      })
    ).resolves.toEqual({
      kind: 'created',
      asset: { id: 'link_1', type: 'link' },
    })
    await expect(
      createWorkspaceAsset({
        userId: 'user_1',
        text: '记得明天下午发报价',
      })
    ).resolves.toEqual({
      kind: 'created',
      asset: { id: 'todo_1', type: 'todo' },
    })
    await expect(
      createWorkspaceAsset({
        userId: 'user_1',
        text: '记录一下今天的复盘结论',
      })
    ).resolves.toEqual({
      kind: 'created',
      asset: { id: 'note_2', type: 'note' },
    })

    expect(workspaceAssetsServiceMock.createWorkspaceLinkAsset).toHaveBeenCalledWith({
      userId: 'user_1',
      rawInput: '收藏一下 https://example.com',
      url: 'https://example.com',
      title: null,
      note: null,
      summary: null,
    })
    expect(workspaceAssetsServiceMock.createWorkspaceTodoAsset).toHaveBeenCalledWith({
      userId: 'user_1',
      rawInput: '记得明天下午发报价',
      title: null,
      content: null,
      timeText: null,
      dueAt: null,
    })
    expect(workspaceAssetsServiceMock.createWorkspaceNoteAsset).toHaveBeenCalledWith({
      userId: 'user_1',
      rawInput: '记录一下今天的复盘结论',
      title: null,
      content: null,
      summary: null,
    })
  })

  it('updateWorkspaceNote delegates to workspace assets service and preserves payload', async () => {
    workspaceAssetsServiceMock.updateWorkspaceNoteAsset.mockResolvedValue({
      id: 'note_1',
      type: 'note',
    })

    const result = await updateWorkspaceNote({
      userId: 'user_1',
      assetId: 'note_1',
      rawInput: '更新后的正文',
      title: '新标题',
      content: '新内容',
    })

    expect(workspaceAssetsServiceMock.updateWorkspaceNoteAsset).toHaveBeenCalledWith({
      userId: 'user_1',
      assetId: 'note_1',
      rawInput: '更新后的正文',
      title: '新标题',
      content: '新内容',
      summary: undefined,
    })
    expect(result).toEqual({ id: 'note_1', type: 'note' })
  })

  it('updateWorkspaceBookmark maps workspace assets errors to module errors', async () => {
    workspaceAssetsServiceMock.updateWorkspaceLinkAsset.mockRejectedValue(
      new workspaceAssetsServiceMock.WorkspaceAssetsError(
        '没有找到这条书签，或你没有权限更新它。',
        'ASSET_NOT_FOUND'
      )
    )

    await expect(
      updateWorkspaceBookmark({
        userId: 'user_1',
        assetId: 'link_1',
        rawInput: '收藏更新',
        url: 'https://example.com',
      })
    ).rejects.toMatchObject({
      publicMessage: '没有找到这条书签，或你没有权限更新它。',
      code: WORKSPACE_MODULE_ERROR_CODES.ASSET_NOT_FOUND,
    })

    await expect(
      updateWorkspaceBookmark({
        userId: 'user_1',
        assetId: 'link_1',
        rawInput: '收藏更新',
        url: 'https://example.com',
      })
    ).rejects.toThrow(WorkspaceModuleError)
  })

  it('setWorkspaceTodoCompletion delegates to workspace assets service', async () => {
    workspaceAssetsServiceMock.setWorkspaceTodoAssetCompletion.mockResolvedValue({
      id: 'todo_1',
      type: 'todo',
      completed: true,
    })

    const result = await setWorkspaceTodoCompletion({
      userId: 'user_1',
      assetId: 'todo_1',
      completed: true,
    })

    expect(workspaceAssetsServiceMock.setWorkspaceTodoAssetCompletion).toHaveBeenCalledWith({
      userId: 'user_1',
      assetId: 'todo_1',
      completed: true,
    })
    expect(result).toEqual({
      id: 'todo_1',
      type: 'todo',
      completed: true,
    })
  })

  it('setWorkspaceTodoCompletion maps workspace assets errors to module errors', async () => {
    workspaceAssetsServiceMock.setWorkspaceTodoAssetCompletion.mockRejectedValue(
      new workspaceAssetsServiceMock.WorkspaceAssetsError(
        '没有找到这条待办，或你没有权限更新它。',
        WORKSPACE_MODULE_ERROR_CODES.TODO_NOT_FOUND
      )
    )

    await expect(
      setWorkspaceTodoCompletion({
        userId: 'user_1',
        assetId: 'todo_1',
        completed: true,
      })
    ).rejects.toMatchObject({
      publicMessage: '没有找到这条待办，或你没有权限更新它。',
      code: WORKSPACE_MODULE_ERROR_CODES.TODO_NOT_FOUND,
    })

    await expect(
      setWorkspaceTodoCompletion({
        userId: 'user_1',
        assetId: 'todo_1',
        completed: true,
      })
    ).rejects.toThrow(WorkspaceModuleError)
  })

  it('purgeWorkspaceAsset keeps original module error when asset is not trashed', async () => {
    bookmarksMock.getBookmarkById.mockResolvedValue(buildBookmarkAsset())

    await expect(
      purgeWorkspaceAsset({
        userId: 'user_1',
        assetId: 'link_1',
        assetType: 'link',
      })
    ).rejects.toMatchObject({
      publicMessage: '永久删除只允许在回收站中执行。',
      code: WORKSPACE_MODULE_ERROR_CODES.PURGE_REQUIRES_TRASHED_ASSET,
    })

    await expect(
      purgeWorkspaceAsset({
        userId: 'user_1',
        assetId: 'link_1',
        assetType: 'link',
      })
    ).rejects.toThrow(WorkspaceModuleError)

    expect(bookmarksMock.purgeBookmark).not.toHaveBeenCalled()
  })

  it('listWorkspaceAssetsPage routes typed note pages through the note adapter', async () => {
    notesMock.listNotesPage.mockResolvedValue({
      items: [buildNoteAsset()],
      pageInfo: {
        pageSize: 25,
        nextCursor: 'next_note_cursor',
        hasNextPage: true,
      },
    })

    const result = await listWorkspaceAssetsPage({
      userId: 'user_1',
      type: 'note',
      pageSize: 25,
      cursor: 'note_cursor',
    })

    expect(notesMock.listNotesPage).toHaveBeenCalledWith({
      userId: 'user_1',
      pageSize: 25,
      cursor: 'note_cursor',
      lifecycleStatus: 'active',
    })
    expect(bookmarksMock.listBookmarksPage).not.toHaveBeenCalled()
    expect(todosMock.listTodosPage).not.toHaveBeenCalled()
    expect(result).toMatchObject({
      items: [{ id: 'note_1', type: 'note', summary: 'summary' }],
      pageInfo: {
        pageSize: 25,
        nextCursor: 'next_note_cursor',
        hasNextPage: true,
      },
    })
  })

  it('listWorkspaceNoteAssets delegates typed lists to workspace assets service', async () => {
    workspaceAssetsServiceMock.listWorkspaceAssets.mockResolvedValue([
      { id: 'note_1', type: 'note' },
    ])

    const result = await listWorkspaceNoteAssets('user_1', 25)

    expect(workspaceAssetsServiceMock.listWorkspaceAssets).toHaveBeenCalledWith({
      userId: 'user_1',
      type: 'note',
      limit: 25,
      lifecycleStatus: 'active',
    })
    expect(result).toEqual([{ id: 'note_1', type: 'note' }])
  })

  it('listWorkspaceAssetsPage keeps mixed pagination orchestration unchanged', async () => {
    mixedAssetsPaginationMock.decodeMixedWorkspaceAssetsCursor.mockReturnValue({
      kind: 'mixed-workspace-assets',
      notesCursor: 'notes_cursor',
      bookmarksCursor: 'bookmarks_cursor',
      todosCursor: 'todos_cursor',
    })

    notesMock.listNotesPage.mockResolvedValue({
      items: [
        buildNoteAsset({
          createdAt: new Date('2026-05-03T00:00:00.000Z'),
          updatedAt: new Date('2026-05-03T00:00:00.000Z'),
        }),
      ],
      pageInfo: {
        pageSize: 10,
        nextCursor: 'next_note_cursor',
        hasNextPage: true,
      },
    })
    bookmarksMock.listBookmarksPage.mockResolvedValue({
      items: [
        buildBookmarkAsset({
          summary: 'bookmark summary',
          createdAt: new Date('2026-05-02T00:00:00.000Z'),
          updatedAt: new Date('2026-05-02T00:00:00.000Z'),
        }),
      ],
      pageInfo: {
        pageSize: 10,
        nextCursor: 'next_bookmark_cursor',
        hasNextPage: false,
      },
    })
    todosMock.listTodosPage.mockResolvedValue({
      items: [buildTodoAsset()],
      pageInfo: {
        pageSize: 10,
        nextCursor: 'next_todo_cursor',
        hasNextPage: true,
      },
    })
    mixedAssetsPaginationMock.createMixedWorkspaceAssetsPage.mockReturnValue({
      items: [{ id: 'note_1', type: 'note' }],
      pageInfo: {
        pageSize: 10,
        nextCursor: 'mixed_next_cursor',
        hasNextPage: true,
      },
    })

    const result = await listWorkspaceAssetsPage({
      userId: 'user_1',
      pageSize: 10,
      cursor: 'mixed_cursor',
    })

    expect(mixedAssetsPaginationMock.decodeMixedWorkspaceAssetsCursor).toHaveBeenCalledWith(
      'mixed_cursor'
    )
    expect(notesMock.listNotesPage).toHaveBeenCalledWith({
      userId: 'user_1',
      pageSize: 10,
      cursor: 'notes_cursor',
      lifecycleStatus: 'active',
    })
    expect(bookmarksMock.listBookmarksPage).toHaveBeenCalledWith({
      userId: 'user_1',
      pageSize: 10,
      cursor: 'bookmarks_cursor',
      lifecycleStatus: 'active',
    })
    expect(todosMock.listTodosPage).toHaveBeenCalledWith({
      userId: 'user_1',
      pageSize: 10,
      cursor: 'todos_cursor',
      lifecycleStatus: 'active',
    })
    expect(mixedAssetsPaginationMock.createMixedWorkspaceAssetsPage).toHaveBeenCalledWith({
      pageSize: 10,
      incomingCursor: {
        kind: 'mixed-workspace-assets',
        notesCursor: 'notes_cursor',
        bookmarksCursor: 'bookmarks_cursor',
        todosCursor: 'todos_cursor',
      },
      notesPage: {
        items: [expect.objectContaining({ id: 'note_1', type: 'note', summary: 'summary' })],
        pageInfo: {
          pageSize: 10,
          nextCursor: 'next_note_cursor',
          hasNextPage: true,
        },
      },
      bookmarksPage: {
        items: [
          expect.objectContaining({
            id: 'link_1',
            type: 'link',
            summary: 'bookmark summary',
          }),
        ],
        pageInfo: {
          pageSize: 10,
          nextCursor: 'next_bookmark_cursor',
          hasNextPage: false,
        },
      },
      todosPage: {
        items: [expect.objectContaining({ id: 'todo_1', type: 'todo', completed: false })],
        pageInfo: {
          pageSize: 10,
          nextCursor: 'next_todo_cursor',
          hasNextPage: true,
        },
      },
    })
    expect(result).toEqual({
      items: [{ id: 'note_1', type: 'note' }],
      pageInfo: {
        pageSize: 10,
        nextCursor: 'mixed_next_cursor',
        hasNextPage: true,
      },
    })
  })
})
