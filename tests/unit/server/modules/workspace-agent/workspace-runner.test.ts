import { beforeEach, describe, expect, it, vi } from 'vitest'

import { runWorkspace } from '@/server/modules/workspace-agent/workspace-runner'

const mocks = vi.hoisted(() => ({
  composeWorkspaceAnswer: vi.fn(),
  executeWorkspaceTool: vi.fn(),
  parseWorkspaceTask: vi.fn(),
  routeWorkspaceTask: vi.fn(),
}))

vi.mock('@/server/modules/workspace-agent/workspace-compose', () => ({
  composeWorkspaceAnswer: mocks.composeWorkspaceAnswer,
}))

vi.mock('@/server/modules/workspace-agent/workspace-task-parser', () => ({
  parseWorkspaceTask: mocks.parseWorkspaceTask,
}))

vi.mock('@/server/modules/workspace-agent/workspace-task-router', () => ({
  WorkspaceTaskRoutingError: class WorkspaceTaskRoutingError extends Error {},
  routeWorkspaceTask: mocks.routeWorkspaceTask,
}))

vi.mock('@/server/modules/workspace-agent/workspace-tools', () => ({
  executeWorkspaceTool: mocks.executeWorkspaceTool,
  workspaceTools: {},
}))

describe('runWorkspace', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.composeWorkspaceAnswer.mockResolvedValue({
      answer: '整理完成',
      usedFallback: false,
    })
  })

  it('returns parse_failed when task parsing fails', async () => {
    mocks.parseWorkspaceTask.mockRejectedValue(new Error('parse boom'))

    const result = await runWorkspace({
      message: '帮我整理一下',
      userId: 'user_1',
    })

    expect(result).toEqual({
      ok: false,
      phase: 'parse_failed',
      message: 'parse boom',
    })
  })

  it('returns unsupported_task when routing fails', async () => {
    mocks.parseWorkspaceTask.mockResolvedValue({
      intent: 'update',
      target: 'bookmarks',
      payload: {
        title: 'new title',
      },
    })
    mocks.routeWorkspaceTask.mockImplementation(() => {
      throw new Error('unsupported')
    })

    const result = await runWorkspace({
      message: '改一下这个书签',
      userId: 'user_1',
    })

    expect(result).toEqual({
      ok: false,
      phase: 'unsupported_task',
      message: 'Unsupported workspace task.',
      task: {
        intent: 'update',
        target: 'bookmarks',
        payload: {
          title: 'new title',
        },
      },
    })
  })

  it('returns a successful query result', async () => {
    mocks.parseWorkspaceTask.mockResolvedValue({
      intent: 'query',
      target: 'notes',
      query: '项目复盘',
    })
    mocks.routeWorkspaceTask.mockReturnValue({
      intent: 'query',
      target: 'notes',
      toolName: 'search_notes',
      toolInput: {
        query: '项目复盘',
      },
      needsCompose: false,
    })
    mocks.executeWorkspaceTool.mockResolvedValue({
      ok: true,
      target: 'notes',
      items: [{ id: 'note_1' }],
      total: 1,
    })

    const result = await runWorkspace({
      message: '找下项目复盘',
      userId: 'user_1',
    })

    expect(result).toEqual({
      ok: true,
      phase: 'completed',
      task: {
        intent: 'query',
        target: 'notes',
        query: '项目复盘',
      },
      plan: {
        intent: 'query',
        target: 'notes',
        toolName: 'search_notes',
        toolInput: {
          query: '项目复盘',
        },
        needsCompose: false,
      },
      data: {
        ok: true,
        target: 'notes',
        items: [{ id: 'note_1' }],
        total: 1,
      },
      answer: '整理完成',
    })
  })

  it('returns tool_failed when execution returns a structured failure', async () => {
    mocks.parseWorkspaceTask.mockResolvedValue({
      intent: 'create',
      target: 'todos',
      payload: {
        title: '明天开会',
      },
    })
    mocks.routeWorkspaceTask.mockReturnValue({
      intent: 'create',
      target: 'todos',
      toolName: 'create_todo',
      toolInput: {
        title: '明天开会',
      },
      needsCompose: false,
    })
    mocks.executeWorkspaceTool.mockResolvedValue({
      ok: false,
      code: 'CREATE_FAILED',
      message: 'create failed',
    })

    const result = await runWorkspace({
      message: '创建待办',
      userId: 'user_1',
    })

    expect(result).toEqual({
      ok: false,
      phase: 'tool_failed',
      message: 'create failed',
      task: {
        intent: 'create',
        target: 'todos',
        payload: {
          title: '明天开会',
        },
      },
      plan: {
        intent: 'create',
        target: 'todos',
        toolName: 'create_todo',
        toolInput: {
          title: '明天开会',
        },
        needsCompose: false,
      },
      data: {
        ok: false,
        code: 'CREATE_FAILED',
        message: 'create failed',
      },
    })
  })

  it('emits phase events in order for summarize flows', async () => {
    mocks.parseWorkspaceTask.mockResolvedValue({
      intent: 'summarize',
      target: 'todos',
    })
    mocks.routeWorkspaceTask.mockReturnValue({
      intent: 'summarize',
      target: 'todos',
      toolName: 'search_todos',
      toolInput: {},
      needsCompose: true,
    })
    mocks.executeWorkspaceTool.mockResolvedValue({
      ok: true,
      target: 'todos',
      items: [{ id: 'todo_1' }, { id: 'todo_2' }],
      total: 2,
    })

    const events: Array<{ phase: string; status: string }> = []
    const result = await runWorkspace({
      message: '总结最近待办',
      userId: 'user_1',
      onEvent: (event) => {
        events.push({ phase: event.phase, status: event.status })
      },
    })

    expect(result).toMatchObject({
      ok: true,
      answer: '整理完成',
    })
    expect(events).toEqual([
      { phase: 'parse', status: 'active' },
      { phase: 'parse', status: 'done' },
      { phase: 'route', status: 'active' },
      { phase: 'route', status: 'done' },
      { phase: 'execute', status: 'active' },
      { phase: 'execute', status: 'done' },
      { phase: 'compose', status: 'active' },
      { phase: 'compose', status: 'done' },
    ])
  })

  it('uses fallback compose text when AI composition falls back', async () => {
    mocks.parseWorkspaceTask.mockResolvedValue({
      intent: 'summarize',
      target: 'notes',
    })
    mocks.routeWorkspaceTask.mockReturnValue({
      intent: 'summarize',
      target: 'notes',
      toolName: 'search_notes',
      toolInput: {},
      needsCompose: true,
    })
    mocks.executeWorkspaceTool.mockResolvedValue({
      ok: true,
      target: 'notes',
      items: [],
      total: 0,
    })
    mocks.composeWorkspaceAnswer.mockResolvedValue({
      answer: '目前没有可整理的笔记。',
      usedFallback: true,
    })

    const events: Array<{ phase: string; status: string; message?: string }> = []
    const result = await runWorkspace({
      message: '总结最近笔记',
      userId: 'user_1',
      onEvent: (event) => {
        events.push(event)
      },
    })

    expect(result).toMatchObject({
      ok: true,
      answer: '目前没有可整理的笔记。',
    })
    expect(events.at(-1)).toEqual({
      phase: 'compose',
      status: 'done',
      message: '已整理结果（使用回退文案）',
    })
  })
})
