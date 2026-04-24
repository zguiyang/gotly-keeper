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

vi.mock('@/server/modules/workspace', () => ({
  createWorkspaceLink: mocks.createWorkspaceLink,
  createWorkspaceNote: mocks.createWorkspaceNote,
  createWorkspaceTodo: mocks.createWorkspaceTodo,
  listWorkspaceAssets: mocks.listWorkspaceAssets,
  searchWorkspaceAssets: mocks.searchWorkspaceAssets,
  setWorkspaceTodoCompletion: mocks.setWorkspaceTodoCompletion,
  updateWorkspaceTodo: mocks.updateWorkspaceTodo,
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
      },
      { userId: 'user_1' }
    )

    expect(mocks.searchWorkspaceAssets).toHaveBeenCalledWith({
      userId: 'user_1',
      query: '项目复盘',
      typeHint: 'note',
    })
    expect(result).toEqual({
      ok: true,
      target: 'notes',
      items: [{ id: 'note_1', type: 'note', title: '复盘', createdAt: new Date('2026-04-22T10:00:00.000Z') }],
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
      kind: 'created',
      asset: { id: 'note_1', type: 'note', content: '# 会议纪要\n\n同步本周发布计划' },
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
      kind: 'created',
      asset: { id: 'todo_1', type: 'todo', title: '交周报' },
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
})
