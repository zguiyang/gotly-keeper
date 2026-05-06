import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  executeWorkspaceTool,
  workspaceTools,
} from '@/server/modules/workspace-agent/workspace-tools'

const mocks = vi.hoisted(() => ({
  createWorkspaceLink: vi.fn(),
  createWorkspaceNote: vi.fn(),
  createWorkspaceTodo: vi.fn(),
  listWorkspaceAssets: vi.fn(),
  searchWorkspaceAssets: vi.fn(),
  setWorkspaceTodoCompletion: vi.fn(),
  updateWorkspaceTodo: vi.fn(),
}))

vi.mock('@/server/services/workspace/workspace-assets.service', () => ({
  createWorkspaceLinkAsset: mocks.createWorkspaceLink,
  createWorkspaceNoteAsset: mocks.createWorkspaceNote,
  createWorkspaceTodoAsset: mocks.createWorkspaceTodo,
  listWorkspaceAssets: mocks.listWorkspaceAssets,
  searchWorkspaceAssets: mocks.searchWorkspaceAssets,
  setWorkspaceTodoAssetCompletion: mocks.setWorkspaceTodoCompletion,
  updateWorkspaceTodoAsset: mocks.updateWorkspaceTodo,
}))

describe('workspaceTools', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('search_notes uses semantic search when query text is available', async () => {
    mocks.searchWorkspaceAssets.mockResolvedValue([
      { id: 'note_1', type: 'note', title: '复盘', createdAt: new Date('2026-04-22T10:00:00.000Z') },
    ])

    const result = await workspaceTools.search_notes.execute(
      {
        query: '项目复盘',
        subjectHint: null,
        timeRange: null,
        limit: 10,
        recentFocus: false,
      },
      { userId: 'user_1' }
    )

    expect(mocks.searchWorkspaceAssets).toHaveBeenCalledWith({
      userId: 'user_1',
      query: '项目复盘',
      timeFilter: null,
      typeHint: 'note',
    })
    expect(result).toEqual({
      ok: true,
      target: 'notes',
      items: [{ id: 'note_1', type: 'note', title: '复盘', createdAt: new Date('2026-04-22T10:00:00.000Z') }],
      total: 1,
    })
  })

  it('search_notes forwards today timeRange as an exact range filter', async () => {
    mocks.searchWorkspaceAssets.mockResolvedValue([])

    await workspaceTools.search_notes.execute(
      {
        query: '日报',
        subjectHint: null,
        timeRange: { type: 'today' },
        limit: 10,
        recentFocus: false,
      },
      { userId: 'user_1' }
    )

    expect(mocks.searchWorkspaceAssets).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user_1',
        query: '日报',
        typeHint: 'note',
        timeFilter: expect.objectContaining({ kind: 'exact_range', phrase: 'today' }),
      })
    )
  })

  it('search_todos filters list results by custom timeRange when query is empty', async () => {
    mocks.listWorkspaceAssets.mockResolvedValue([
      { id: 'todo_1', type: 'todo', createdAt: new Date('2026-04-20T09:00:00.000Z') },
      { id: 'todo_2', type: 'todo', createdAt: new Date('2026-04-23T09:00:00.000Z') },
    ])

    const result = await workspaceTools.search_todos.execute(
      {
        query: null,
        subjectHint: null,
        timeRange: {
          type: 'custom',
          startAt: '2026-04-22T00:00:00.000Z',
          endAt: '2026-04-24T00:00:00.000Z',
        },
        limit: 10,
        status: 'all',
        recentFocus: false,
      },
      { userId: 'user_1' }
    )

    expect(result).toEqual({
      ok: true,
      target: 'todos',
      items: [{ id: 'todo_2', type: 'todo', createdAt: new Date('2026-04-23T09:00:00.000Z') }],
      total: 1,
    })
  })

  it('search_todos falls back to listWorkspaceAssets when no query is provided', async () => {
    mocks.listWorkspaceAssets.mockResolvedValue([
      { id: 'todo_1', type: 'todo', completed: false, createdAt: new Date('2026-04-22T09:00:00.000Z') },
    ])

    const result = await workspaceTools.search_todos.execute(
      {
        query: null,
        subjectHint: null,
        timeRange: null,
        limit: 10,
        status: 'all',
        recentFocus: false,
      },
      { userId: 'user_1' }
    )

    expect(mocks.listWorkspaceAssets).toHaveBeenCalledWith({
      userId: 'user_1',
      type: 'todo',
      limit: 10,
    })
    expect(result).toMatchObject({
      ok: true,
      target: 'todos',
      total: 1,
    })
  })

  it('search_all searches across all asset types when query text is provided', async () => {
    mocks.searchWorkspaceAssets.mockResolvedValue([
      { id: 'bookmark_1', type: 'link', title: '竞品参考', createdAt: new Date('2026-04-22T09:00:00.000Z') },
    ])

    const result = await executeWorkspaceTool(
      {
        toolName: 'search_all',
        toolInput: {
          query: '木曜日咖啡不存在的冷门内部代号',
          subjectHint: null,
          timeRange: null,
          limit: 10,
        },
      },
      { userId: 'user_1' }
    )

    expect(mocks.searchWorkspaceAssets).toHaveBeenCalledWith({
      userId: 'user_1',
      query: '木曜日咖啡不存在的冷门内部代号',
      timeFilter: null,
      typeHint: null,
    })
    expect(result).toEqual({
      ok: true,
      target: 'mixed',
      items: [{ id: 'bookmark_1', type: 'link', title: '竞品参考', createdAt: new Date('2026-04-22T09:00:00.000Z') }],
      total: 1,
    })
  })

  it('search_all uses shared selector semantics when selector is provided', async () => {
    mocks.searchWorkspaceAssets.mockResolvedValue([
      { id: 'todo_1', type: 'todo', title: '报价待办', createdAt: new Date('2026-04-22T09:00:00.000Z') },
    ])

    const result = await executeWorkspaceTool(
      {
        toolName: 'search_all',
        toolInput: {
          selector: {
            target: 'mixed',
            subject: '报价',
            keywords: ['报价'],
            timeConstraint: {
              kind: 'relative_window',
              anchor: 'now',
              direction: 'past',
              unit: 'minute',
              value: 10,
              strength: 'hard',
            },
            sort: 'recent_first',
            limit: 5,
          },
        },
      },
      { userId: 'user_1' }
    )

    expect(mocks.searchWorkspaceAssets).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user_1',
        query: '报价',
        typeHint: null,
        timeFilter: expect.objectContaining({ kind: 'exact_range' }),
      })
    )
    expect(result).toMatchObject({
      ok: true,
      target: 'mixed',
      total: 1,
    })
  })

  it('search_todos forwards recentFocus queries as top-match searches', async () => {
    mocks.searchWorkspaceAssets.mockResolvedValue([
      { id: 'todo_1', type: 'todo', title: '报价待办', createdAt: new Date('2026-04-22T09:00:00.000Z') },
    ])

    await workspaceTools.search_todos.execute(
      {
        query: '刚刚记的报价待办',
        subjectHint: '帮我找一下刚刚记的报价待办',
        timeRange: null,
        limit: 1,
        status: 'all',
        recentFocus: true,
      },
      { userId: 'user_1' }
    )

    expect(mocks.searchWorkspaceAssets).toHaveBeenCalledWith({
      userId: 'user_1',
      query: '刚刚记的报价待办 帮我找一下刚刚记的报价待办',
      timeFilter: null,
      typeHint: 'todo',
    })
  })

  it('get_recent_items merges results from all requested targets', async () => {
    mocks.listWorkspaceAssets
      .mockResolvedValueOnce([
        { id: 'note_1', type: 'note', createdAt: new Date('2026-04-22T08:00:00.000Z') },
      ])
      .mockResolvedValueOnce([
        { id: 'todo_1', type: 'todo', createdAt: new Date('2026-04-22T09:00:00.000Z') },
      ])

    const result = await executeWorkspaceTool(
      {
        toolName: 'get_recent_items',
        toolInput: {
          targets: ['notes', 'todos'],
          timeRange: { type: 'recent' },
          limitPerTarget: 5,
        },
      },
      { userId: 'user_1' }
    )

    expect(result).toMatchObject({
      ok: true,
      target: 'mixed',
      total: 2,
    })
    if (!result.ok) {
      return
    }

    expect(result.items?.map((item) => (item as { id: string }).id)).toEqual(['todo_1', 'note_1'])
  })

  it('create_note returns a normalized mutation envelope', async () => {
    mocks.createWorkspaceNote.mockResolvedValue({
      id: 'note_1',
      type: 'note',
      content: '# 会议纪要\n\n同步本周发布计划',
    })

    const result = await executeWorkspaceTool(
      {
        toolName: 'create_note',
        toolInput: {
          content: '# 会议纪要\n\n同步本周发布计划',
        },
      },
      { userId: 'user_1' }
    )

    expect(mocks.createWorkspaceNote).toHaveBeenCalledWith({
      userId: 'user_1',
      rawInput: '# 会议纪要\n\n同步本周发布计划',
      content: '# 会议纪要\n\n同步本周发布计划',
    })
    expect(result).toEqual({
      ok: true,
      target: 'notes',
      action: 'create',
      item: { id: 'note_1', type: 'note', content: '# 会议纪要\n\n同步本周发布计划' },
    })
  })

  it('create_todo forwards the original time phrase with the normalized due date', async () => {
    mocks.createWorkspaceTodo.mockResolvedValue({
      id: 'todo_1',
      type: 'todo',
      title: '交周报',
    })

    const result = await executeWorkspaceTool(
      {
        toolName: 'create_todo',
        toolInput: {
          title: '交周报',
          details: '发给项目群',
          timeText: '下周三下午',
          dueAt: '2026-04-29T07:00:00.000Z',
        },
      },
      { userId: 'user_1' }
    )

    expect(mocks.createWorkspaceTodo).toHaveBeenCalledWith({
      userId: 'user_1',
      rawInput: '交周报',
      title: '交周报',
      content: '发给项目群',
      timeText: '下周三下午',
      dueAt: new Date('2026-04-29T07:00:00.000Z'),
    })
    expect(result).toEqual({
      ok: true,
      target: 'todos',
      action: 'create',
      item: { id: 'todo_1', type: 'todo', title: '交周报' },
    })
  })

  it('create_bookmark keeps note and summary text in raw input for later retrieval', async () => {
    mocks.createWorkspaceLink.mockResolvedValue({
      id: 'bookmark_1',
      type: 'link',
      title: '星巴克中国',
    })

    const result = await executeWorkspaceTool(
      {
        toolName: 'create_bookmark',
        toolInput: {
          url: 'https://www.starbucks.com.cn/',
          title: '星巴克中国',
          note: '回头发给客户',
          summary: '木曜日咖啡竞品参考链接，重点看首屏卖点和价格露出。',
        },
      },
      { userId: 'user_1' }
    )

    expect(mocks.createWorkspaceLink).toHaveBeenCalledWith({
      userId: 'user_1',
      rawInput:
        '星巴克中国\n\n回头发给客户\n\n木曜日咖啡竞品参考链接，重点看首屏卖点和价格露出。\n\nhttps://www.starbucks.com.cn/',
      url: 'https://www.starbucks.com.cn/',
      title: '星巴克中国',
      note: '回头发给客户',
      summary: '木曜日咖啡竞品参考链接，重点看首屏卖点和价格露出。',
    })
    expect(result).toEqual({
      ok: true,
      target: 'bookmarks',
      action: 'create',
      item: { id: 'bookmark_1', type: 'link', title: '星巴克中国' },
    })
  })

  it('update_todo resolves a todo by query and marks it complete', async () => {
    mocks.searchWorkspaceAssets.mockResolvedValue([
      { id: 'todo_1', type: 'todo', createdAt: new Date('2026-04-22T10:00:00.000Z') },
    ])
    mocks.setWorkspaceTodoCompletion.mockResolvedValue({
      id: 'todo_1',
      type: 'todo',
      completed: true,
    })

    const result = await executeWorkspaceTool(
      {
        toolName: 'update_todo',
        toolInput: {
          selector: {
            query: '今天那个待办',
          },
          patch: {
            status: 'done',
          },
        },
      },
      { userId: 'user_1' }
    )

    expect(mocks.searchWorkspaceAssets).toHaveBeenCalledWith({
      userId: 'user_1',
      query: '今天那个待办',
      typeHint: 'todo',
    })
    expect(mocks.setWorkspaceTodoCompletion).toHaveBeenCalledWith({
      userId: 'user_1',
      assetId: 'todo_1',
      completed: true,
    })
    expect(result).toEqual({
      ok: true,
      target: 'todos',
      action: 'update',
      item: {
        id: 'todo_1',
        type: 'todo',
        completed: true,
      },
    })
  })

  it('update_todo uses shared selector resolution when semantic selector is provided', async () => {
    mocks.searchWorkspaceAssets.mockResolvedValue([
      {
        id: 'todo_1',
        type: 'todo',
        title: '报价待办',
        completed: false,
        createdAt: new Date('2026-04-22T10:00:00.000Z'),
      },
    ])
    mocks.updateWorkspaceTodo.mockResolvedValue({
      id: 'todo_1',
      type: 'todo',
      title: '新的报价标题',
      completed: false,
    })

    const result = await executeWorkspaceTool(
      {
        toolName: 'update_todo',
        toolInput: {
          selector: {
            query: '报价',
          },
          semanticSelector: {
            target: 'todos',
            subject: '报价',
            keywords: ['报价'],
            timeConstraint: {
              kind: 'recent',
              strength: 'strong',
            },
            sort: 'recent_first',
            limit: 3,
          },
          patch: {
            title: '新的报价标题',
          },
        },
      },
      { userId: 'user_1' }
    )

    expect(mocks.searchWorkspaceAssets).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user_1',
        query: '报价',
        typeHint: 'todo',
      })
    )
    expect(mocks.updateWorkspaceTodo).toHaveBeenCalledWith({
      userId: 'user_1',
      assetId: 'todo_1',
      rawInput: '新的报价标题',
      title: '新的报价标题',
      content: null,
      timeText: null,
      dueAt: null,
    })
    expect(result).toMatchObject({
      ok: true,
      target: 'todos',
      action: 'update',
      item: { id: 'todo_1', title: '新的报价标题' },
    })
  })
})
