import { asSchema } from 'ai'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createWorkspaceAgentTools } from '@/server/modules/workspace-agent/workspace-agent-tools'

import type { WorkspaceAgentToolOutput } from '@/server/modules/workspace-agent/workspace-agent.types'

type SafeParseResult<T> =
  | { success: true; data: T }
  | { success: false }

async function safeParseToolInput<T>(
  schema: unknown,
  input: unknown
): Promise<SafeParseResult<T>> {
  return (schema as {
    safeParseAsync: (value: unknown) => Promise<SafeParseResult<T>>
  }).safeParseAsync(input)
}

const createWorkspaceNoteMock = vi.hoisted(() => vi.fn())
const createWorkspaceTodoMock = vi.hoisted(() => vi.fn())
const createWorkspaceLinkMock = vi.hoisted(() => vi.fn())
const searchWorkspaceAssetsMock = vi.hoisted(() => vi.fn())
const reviewWorkspaceUnfinishedTodosMock = vi.hoisted(() => vi.fn())
const summarizeWorkspaceRecentNotesMock = vi.hoisted(() => vi.fn())
const summarizeWorkspaceRecentBookmarksMock = vi.hoisted(() => vi.fn())

vi.mock('@/server/modules/workspace', () => ({
  createWorkspaceLink: createWorkspaceLinkMock,
  createWorkspaceNote: createWorkspaceNoteMock,
  createWorkspaceTodo: createWorkspaceTodoMock,
  reviewWorkspaceUnfinishedTodos: reviewWorkspaceUnfinishedTodosMock,
  searchWorkspaceAssets: searchWorkspaceAssetsMock,
  summarizeWorkspaceRecentBookmarks: summarizeWorkspaceRecentBookmarksMock,
  summarizeWorkspaceRecentNotes: summarizeWorkspaceRecentNotesMock,
}))

describe('createWorkspaceAgentTools', () => {
  beforeEach(() => {
    createWorkspaceNoteMock.mockReset()
    createWorkspaceTodoMock.mockReset()
    createWorkspaceLinkMock.mockReset()
    searchWorkspaceAssetsMock.mockReset()
    reviewWorkspaceUnfinishedTodosMock.mockReset()
    summarizeWorkspaceRecentNotesMock.mockReset()
    summarizeWorkspaceRecentBookmarksMock.mockReset()
  })

  it('exposes a small MVP tool surface without a normal clarification tool', () => {
    const tools = createWorkspaceAgentTools({ userId: 'user_1' })

    expect(Object.keys(tools).sort()).toEqual([
      'create_workspace_asset',
      'get_workspace_capabilities',
      'search_workspace',
      'summarize_workspace',
    ])
  })

  it('create_workspace_asset delegates note creation and returns safe trace output', async () => {
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
    const output = (await tools.create_workspace_asset.execute!(
      {
        rawInputPreview: '帮我记一下首页文案方向',
        normalizedRequest: '保存笔记：首页文案方向',
        assetType: 'note',
        title: '首页文案方向',
        content: '首页文案方向',
        url: null,
        note: null,
        timeText: null,
        dueAtIso: null,
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
    expect(output.trace.map((event) => event.type)).toEqual([
      'input_normalized',
      'intent_identified',
      'parameters_collected',
      'tool_selected',
      'tool_executed',
    ])
    expect(output.trace[1]).toMatchObject({
      type: 'intent_identified',
      operation: 'create',
      assetType: 'note',
    })
    expect(output.trace[2]).toMatchObject({
      type: 'parameters_collected',
      parameters: expect.objectContaining({
        assetType: 'note',
        title: '首页文案方向',
      }),
    })
    expect(output.trace.some((event: WorkspaceAgentToolOutput['trace'][number]) => event.type === 'tool_executed')).toBe(true)
    expect(JSON.stringify(output)).not.toContain('apiKey')
  })

  it('create_workspace_asset accepts empty nullable fields from model output', async () => {
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
    const input = {
      rawInputPreview: '记一下：首页文案方向',
      normalizedRequest: '首页文案方向',
      assetType: 'note',
      title: '首页文案方向',
      content: '首页文案方向',
      url: '',
      note: '',
      timeText: '',
      dueAtIso: '',
      publicReason: '保存为笔记',
    }

    const parsed = await safeParseToolInput<Parameters<
      NonNullable<typeof tools.create_workspace_asset.execute>
    >[0]>(tools.create_workspace_asset.inputSchema, input)

    expect(parsed.success).toBe(true)
    if (!parsed.success) {
      return
    }

    const output = (await tools.create_workspace_asset.execute!(
      parsed.data,
      { toolCallId: 'tool_1', messages: [] }
    )) as WorkspaceAgentToolOutput

    expect(createWorkspaceNoteMock).toHaveBeenCalledWith({
      userId: 'user_1',
      rawInput: '记一下：首页文案方向',
      title: '首页文案方向',
      content: '首页文案方向',
      summary: null,
    })
    expect(output.result.kind).toBe('created')
  })

  it('create_workspace_asset accepts empty nullable fields through AI SDK validation', async () => {
    const tools = createWorkspaceAgentTools({ userId: 'user_1' })
    const input = {
      rawInputPreview: '记一下：首页文案方向',
      normalizedRequest: '首页文案方向',
      assetType: 'note',
      title: '首页文案方向',
      content: '首页文案方向',
      url: '',
      note: '',
      timeText: '',
      dueAtIso: '',
      publicReason: '保存为笔记',
    }

    const validated = await asSchema(tools.create_workspace_asset.inputSchema).validate?.(input)

    expect(validated?.success).toBe(true)
  })

  it('create_workspace_asset falls back meta fields when model omits them', async () => {
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
    const parsed = await safeParseToolInput<Parameters<
      NonNullable<typeof tools.create_workspace_asset.execute>
    >[0]>(tools.create_workspace_asset.inputSchema, {
      assetType: 'note',
      title: '首页文案方向',
      content: '首页文案方向',
      url: null,
      note: null,
      timeText: null,
      dueAtIso: null,
    })

    expect(parsed.success).toBe(true)
    if (!parsed.success) {
      return
    }

    const output = (await tools.create_workspace_asset.execute!(
      parsed.data,
      { toolCallId: 'tool_1', messages: [] }
    )) as WorkspaceAgentToolOutput

    expect(createWorkspaceNoteMock).toHaveBeenCalledWith({
      userId: 'user_1',
      rawInput: '用户输入',
      title: '首页文案方向',
      content: '首页文案方向',
      summary: null,
    })
    expect(output.trace[0]).toMatchObject({
      type: 'input_normalized',
      rawInputPreview: '用户输入',
      normalizedRequest: '用户输入',
    })
    expect(output.trace[1]).toMatchObject({
      type: 'intent_identified',
      publicReason: '按默认规则执行。',
    })
  })

  it('create_workspace_asset infers note assetType when the model omits it', async () => {
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
    const parsed = await safeParseToolInput<Parameters<
      NonNullable<typeof tools.create_workspace_asset.execute>
    >[0]>(
      tools.create_workspace_asset.inputSchema,
      {
        rawInputPreview: '记一下：首页文案方向',
        normalizedRequest: '首页文案方向',
        title: '首页文案方向',
        content: '首页文案方向',
        url: null,
        note: null,
        timeText: null,
        dueAtIso: null,
      }
    )

    expect(parsed.success).toBe(true)
    if (!parsed.success) {
      return
    }

    const output = (await tools.create_workspace_asset.execute!(
      parsed.data,
      { toolCallId: 'tool_1', messages: [] }
    )) as WorkspaceAgentToolOutput

    expect(createWorkspaceNoteMock).toHaveBeenCalledWith({
      userId: 'user_1',
      rawInput: '记一下：首页文案方向',
      title: '首页文案方向',
      content: '首页文案方向',
      summary: null,
    })
    expect(output.trace[2]).toMatchObject({
      type: 'parameters_collected',
      parameters: expect.objectContaining({
        assetType: 'note',
      }),
    })
  })

  it('create_workspace_asset stores todo due dates when the agent resolves time', async () => {
    createWorkspaceTodoMock.mockResolvedValue({
      kind: 'created',
      asset: {
        id: 'todo_1',
        type: 'todo',
        title: '交材料',
        excerpt: '交材料',
        originalText: '今晚 8 点交材料',
        url: null,
        timeText: '今晚 8 点',
        dueAt: new Date('2026-04-20T12:00:00.000Z'),
        completed: false,
        createdAt: new Date('2026-04-20T10:00:00.000Z'),
      },
    })

    const tools = createWorkspaceAgentTools({ userId: 'user_1' })
    const output = (await tools.create_workspace_asset.execute!(
      {
        rawInputPreview: '今晚 8 点交材料',
        normalizedRequest: '创建待办：交材料，今晚 8 点',
        assetType: 'todo',
        title: '交材料',
        content: null,
        url: null,
        note: null,
        timeText: '今晚 8 点',
        dueAtIso: '2026-04-20T12:00:00.000Z',
        publicReason: '用户要创建一条带时间的待办。',
      },
      { toolCallId: 'tool_1', messages: [] }
    )) as WorkspaceAgentToolOutput

    expect(createWorkspaceTodoMock).toHaveBeenCalledWith({
      userId: 'user_1',
      rawInput: '今晚 8 点交材料',
      title: '交材料',
      content: null,
      timeText: '今晚 8 点',
      dueAt: new Date('2026-04-20T12:00:00.000Z'),
    })
    expect(output.result.kind).toBe('created')
  })

  it('search_workspace passes exact ranges and leaves vague ranges unfiltered', async () => {
    searchWorkspaceAssetsMock.mockResolvedValue([])

    const tools = createWorkspaceAgentTools({ userId: 'user_1' })
    const output = (await tools.search_workspace.execute!(
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
    )) as WorkspaceAgentToolOutput

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
    expect(output.trace.map((event) => event.type)).toEqual([
      'input_normalized',
      'intent_identified',
      'parameters_collected',
      'time_resolved',
      'tool_selected',
      'tool_executed',
    ])
    expect(output.trace[1]).toMatchObject({
      type: 'intent_identified',
      operation: 'search',
      assetType: 'link',
    })
    expect(output.trace[2]).toMatchObject({
      type: 'parameters_collected',
      parameters: expect.objectContaining({
        query: '收藏的文章',
        typeHint: 'link',
      }),
    })
  })

  it('summarize_workspace defaults vague recent note summaries to the existing note summary flow', async () => {
    summarizeWorkspaceRecentNotesMock.mockResolvedValue({
      title: '最近笔记重点',
      bullets: ['首页方向更明确'],
      actionItems: ['整理首页文案'],
      sourceCount: 3,
    })

    const tools = createWorkspaceAgentTools({ userId: 'user_1' })
    const output = (await tools.summarize_workspace.execute!(
      {
        rawInputPreview: '总结最近笔记',
        normalizedRequest: '总结最近 20 条笔记',
        target: 'notes',
        query: null,
        limit: 20,
        publicReason: '用户要总结笔记，最近按默认数量处理。',
      },
      { toolCallId: 'tool_1', messages: [] }
    )) as WorkspaceAgentToolOutput

    expect(summarizeWorkspaceRecentNotesMock).toHaveBeenCalledWith({
      userId: 'user_1',
      query: null,
    })
    expect(output.result.kind).toBe('note-summary')
  })

  it('summarize_workspace treats empty query as no query', async () => {
    summarizeWorkspaceRecentNotesMock.mockResolvedValue({
      title: '最近笔记重点',
      bullets: ['首页方向更明确'],
      actionItems: ['整理首页文案'],
      sourceCount: 3,
    })

    const tools = createWorkspaceAgentTools({ userId: 'user_1' })
    const parsed = await safeParseToolInput<Parameters<
      NonNullable<typeof tools.summarize_workspace.execute>
    >[0]>(tools.summarize_workspace.inputSchema, {
      rawInputPreview: '总结最近笔记重点',
      normalizedRequest: '总结最近笔记重点',
      target: 'notes',
      query: '',
      limit: 20,
      publicReason: '用户要总结笔记，最近按默认数量处理。',
    })

    expect(parsed.success).toBe(true)
    if (!parsed.success) {
      return
    }

    const output = (await tools.summarize_workspace.execute!(
      parsed.data,
      { toolCallId: 'tool_1', messages: [] }
    )) as WorkspaceAgentToolOutput

    expect(summarizeWorkspaceRecentNotesMock).toHaveBeenCalledWith({
      userId: 'user_1',
      query: null,
    })
    expect(output.result.kind).toBe('note-summary')
  })

  it('summarize_workspace infers notes target when the model omits it', async () => {
    summarizeWorkspaceRecentNotesMock.mockResolvedValue({
      title: '最近笔记重点',
      bullets: ['首页方向更明确'],
      actionItems: ['整理首页文案'],
      sourceCount: 3,
    })

    const tools = createWorkspaceAgentTools({ userId: 'user_1' })
    const parsed = await safeParseToolInput<Parameters<
      NonNullable<typeof tools.summarize_workspace.execute>
    >[0]>(
      tools.summarize_workspace.inputSchema,
      {
        rawInputPreview: '总结最近笔记重点',
        normalizedRequest: '总结最近笔记重点',
        query: '',
        limit: 20,
      }
    )

    expect(parsed.success).toBe(true)
    if (!parsed.success) {
      return
    }

    const output = (await tools.summarize_workspace.execute!(
      parsed.data,
      { toolCallId: 'tool_1', messages: [] }
    )) as WorkspaceAgentToolOutput

    expect(summarizeWorkspaceRecentNotesMock).toHaveBeenCalledWith({
      userId: 'user_1',
      query: null,
    })
    expect(output.result.kind).toBe('note-summary')
    expect(output.trace[2]).toMatchObject({
      type: 'parameters_collected',
      parameters: expect.objectContaining({
        target: 'notes',
      }),
    })
  })

  it('summarize_workspace infers bookmarks target from bookmark language', async () => {
    summarizeWorkspaceRecentBookmarksMock.mockResolvedValue({
      title: '最近收藏重点',
      bullets: ['关注 AI SDK 更新'],
      actionItems: ['回看收藏文章'],
      sourceCount: 2,
    })

    const tools = createWorkspaceAgentTools({ userId: 'user_1' })
    const parsed = await safeParseToolInput<Parameters<
      NonNullable<typeof tools.summarize_workspace.execute>
    >[0]>(
      tools.summarize_workspace.inputSchema,
      {
        rawInputPreview: '总结最近收藏的文章',
        normalizedRequest: '总结最近收藏的文章',
        query: '',
        limit: 20,
      }
    )

    expect(parsed.success).toBe(true)
    if (!parsed.success) {
      return
    }

    const output = (await tools.summarize_workspace.execute!(
      parsed.data,
      { toolCallId: 'tool_1', messages: [] }
    )) as WorkspaceAgentToolOutput

    expect(summarizeWorkspaceRecentBookmarksMock).toHaveBeenCalledWith({
      userId: 'user_1',
      query: null,
    })
    expect(output.result.kind).toBe('bookmark-summary')
  })
})
