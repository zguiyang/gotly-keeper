import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createWorkspaceAgentTools } from '@/server/modules/workspace-agent/workspace-agent-tools'

import type { WorkspaceAgentToolOutput } from '@/server/modules/workspace-agent/workspace-agent.types'

const createWorkspaceNoteMock = vi.hoisted(() => vi.fn())
const searchWorkspaceAssetsMock = vi.hoisted(() => vi.fn())
const listWorkspaceRecentAssetsMock = vi.hoisted(() => vi.fn())

vi.mock('@/server/modules/workspace', () => ({
  createWorkspaceLink: vi.fn(),
  createWorkspaceNote: createWorkspaceNoteMock,
  createWorkspaceTodo: vi.fn(),
  listWorkspaceRecentAssets: listWorkspaceRecentAssetsMock,
  reviewWorkspaceUnfinishedTodos: vi.fn(),
  searchWorkspaceAssets: searchWorkspaceAssetsMock,
  summarizeWorkspaceRecentBookmarks: vi.fn(),
  summarizeWorkspaceRecentNotes: vi.fn(),
}))

describe('createWorkspaceAgentTools', () => {
  beforeEach(() => {
    createWorkspaceNoteMock.mockReset()
    searchWorkspaceAssetsMock.mockReset()
    listWorkspaceRecentAssetsMock.mockReset()
  })

  it('create_note delegates to workspace module and returns safe trace output', async () => {
    createWorkspaceNoteMock.mockResolvedValue({
      kind: 'created',
      asset: {
        id: 'note_1',
        type: 'note',
        title: '首页文案方向',
        excerpt: '首页文案方向',
        originalText: '首页文案方向',
        url: null,
        timeText: null,
        dueAt: null,
        completed: false,
        createdAt: new Date('2026-04-20T10:00:00.000Z'),
      },
    })

    const tools = createWorkspaceAgentTools({ userId: 'user_1' })
    const output = (await tools.create_note.execute!(
      {
        rawInputPreview: '帮我记一下首页文案方向',
        normalizedRequest: '保存笔记：首页文案方向',
        title: '首页文案方向',
        content: '首页文案方向',
        publicReason: '用户要保存一条普通笔记。',
      },
      { toolCallId: 'tool_1', messages: [] }
    )) as WorkspaceAgentToolOutput

    expect(createWorkspaceNoteMock).toHaveBeenCalledWith({
      userId: 'user_1',
      rawInput: '帮我记一下首页文案方向',
      title: '首页文案方向',
      content: '首页文案方向',
      summary: null,
    })
    expect(output.trace[0]).toMatchObject({
      type: 'input_normalized',
      normalizedRequest: '保存笔记：首页文案方向',
    })
    expect(output.trace.some((event: WorkspaceAgentToolOutput['trace'][number]) => event.type === 'tool_executed')).toBe(true)
    expect(JSON.stringify(output)).not.toContain('apiKey')
  })

  it('search_workspace passes exact ranges and leaves vague ranges unfiltered', async () => {
    searchWorkspaceAssetsMock.mockResolvedValue([])

    const tools = createWorkspaceAgentTools({ userId: 'user_1' })
    await tools.search_workspace.execute!(
      {
        rawInputPreview: '帮我找最近收藏的文章',
        normalizedRequest: '查找收藏的文章',
        query: '收藏的文章',
        typeHint: 'link',
        completionHint: null,
        timeFilter: {
          kind: 'vague',
          phrase: '最近',
          reason: '最近没有固定数学边界',
        },
        publicReason: '用户要查找已保存的书签内容。',
      },
      { toolCallId: 'tool_1', messages: [] }
    )

    expect(searchWorkspaceAssetsMock).toHaveBeenCalledWith({
      userId: 'user_1',
      query: '收藏的文章',
      typeHint: 'link',
      completionHint: null,
      timeFilter: {
        kind: 'vague',
        phrase: '最近',
        reason: '最近没有固定数学边界',
      },
    })
  })

  it('ask_clarifying_question auto-fallbacks to retrieval for safe query intents', async () => {
    searchWorkspaceAssetsMock.mockResolvedValue([])

    const tools = createWorkspaceAgentTools({ userId: 'user_1' })
    const output = (await tools.ask_clarifying_question.execute!(
      {
        rawInputPreview: '帮我看未完成的待办',
        normalizedRequest: '未完成的待办',
        question: '你是想查看全部未完成待办吗？',
        publicReason: '工具调用格式受限，需要确认。',
      },
      { toolCallId: 'tool_1', messages: [] }
    )) as WorkspaceAgentToolOutput

    expect(searchWorkspaceAssetsMock).toHaveBeenCalledWith({
      userId: 'user_1',
      query: '未完成的待办',
      typeHint: 'todo',
      completionHint: 'incomplete',
      timeFilter: { kind: 'none' },
    })
    expect(output.result.kind).toBe('query')
    expect(output.trace.some((event) => event.type === 'tool_executed')).toBe(true)
  })
})
