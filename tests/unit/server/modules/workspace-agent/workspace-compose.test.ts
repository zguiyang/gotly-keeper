import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  buildFallbackAnswer,
  composeWorkspaceAnswer,
} from '@/server/modules/workspace-agent/workspace-compose'

const mocks = vi.hoisted(() => ({
  buildWorkspaceSystemPrompt: vi.fn(),
  renderPrompt: vi.fn(),
  runAiGeneration: vi.fn(),
}))

vi.mock('@/server/lib/ai/ai.prompts', () => ({
  buildWorkspaceSystemPrompt: mocks.buildWorkspaceSystemPrompt,
}))

vi.mock('@/server/lib/ai/ai-runner', () => ({
  runAiGeneration: mocks.runAiGeneration,
}))

vi.mock('@/server/lib/prompt-template', () => ({
  renderPrompt: mocks.renderPrompt,
}))

describe('workspace-compose', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.buildWorkspaceSystemPrompt.mockResolvedValue('system prompt')
    mocks.renderPrompt.mockResolvedValue('user prompt')
  })

  it('returns AI-composed answer when generation succeeds', async () => {
    mocks.runAiGeneration.mockResolvedValue({
      success: true,
      data: {
        answer: '最近有 2 条待办，优先处理今天到期的事项。',
      },
    })

    const result = await composeWorkspaceAnswer({
      task: {
        intent: 'summarize',
        target: 'todos',
      },
      plan: {
        intent: 'summarize',
        target: 'todos',
        toolName: 'search_todos',
        toolInput: {},
        needsCompose: true,
      },
      data: {
        ok: true,
        target: 'todos',
        items: [
          {
            id: 'todo_1',
            type: 'todo',
            title: '准备周会',
            excerpt: '准备周会材料',
            originalText: '准备周会材料',
            url: null,
            timeText: '今天下午',
            dueAt: null,
            completed: false,
            createdAt: new Date('2026-04-22T08:00:00.000Z'),
          },
        ],
        total: 1,
      },
    })

    expect(result).toEqual({
      answer: '最近有 2 条待办，优先处理今天到期的事项。',
      usedFallback: false,
    })
  })

  it('falls back when AI generation fails', async () => {
    mocks.runAiGeneration.mockResolvedValue({
      success: false,
      error: new Error('ai failed'),
    })

    const result = await composeWorkspaceAnswer({
      task: {
        intent: 'query',
        target: 'notes',
      },
      plan: {
        intent: 'query',
        target: 'notes',
        toolName: 'search_notes',
        toolInput: {},
        needsCompose: false,
      },
      data: {
        ok: true,
        target: 'notes',
        items: [],
        total: 0,
      },
    })

    expect(result).toEqual({
      answer: '已找到 0 条笔记。',
      usedFallback: true,
    })
  })

  it('builds empty-state fallback for summarize requests', () => {
    expect(
      buildFallbackAnswer(
        {
          intent: 'summarize',
          target: 'bookmarks',
        },
        {
          ok: true,
          target: 'bookmarks',
          items: [],
          total: 0,
        }
      )
    ).toBe('目前没有可整理的书签。')
  })

  it('fallback answer for create does not mention scheduling', () => {
    const answer = buildFallbackAnswer(
      { intent: 'create', target: 'todos' },
      {
        ok: true,
        target: 'todos',
        action: 'create',
        item: {
          id: 'todo_1',
          type: 'todo',
          title: '买牛奶',
          excerpt: '',
          originalText: '买牛奶 明天上午',
          url: null,
          timeText: '明天上午',
          dueAt: null,
          completed: false,
          createdAt: new Date('2026-05-06T08:00:00.000Z'),
        },
      }
    )

    expect(answer).toBe('已创建待办。')
    expect(answer).not.toContain('排期')
    expect(answer).not.toContain('时间')
    expect(answer).not.toContain('scheduled')
  })

  it('fallback answer for update does not mention scheduling when only timeText exists', () => {
    const answer = buildFallbackAnswer(
      { intent: 'update', target: 'todos' },
      {
        ok: true,
        target: 'todos',
        action: 'update',
        item: {
          id: 'todo_1',
          type: 'todo',
          title: '买牛奶',
          excerpt: '',
          originalText: '买牛奶 明天上午',
          url: null,
          timeText: '明天上午',
          dueAt: null,
          completed: false,
          createdAt: new Date('2026-05-06T08:00:00.000Z'),
        },
      }
    )

    expect(answer).toBe('已更新待办。')
    expect(answer).not.toContain('排期')
    expect(answer).not.toContain('时间')
  })

  it('includes timeText and dueAt in compose prompt payload', async () => {
    mocks.runAiGeneration.mockResolvedValue({
      success: true,
      data: {
        answer: '已创建待办"买牛奶"。',
      },
    })

    let capturedPayload: string | null = null
    mocks.renderPrompt.mockImplementation(
      async (_template: string, vars: Record<string, string>) => {
        capturedPayload = vars.payloadJson
        return 'user prompt'
      }
    )

    await composeWorkspaceAnswer({
      task: { intent: 'create', target: 'todos' },
      plan: {
        intent: 'create',
        target: 'todos',
        toolName: 'create_todo',
        toolInput: {},
        needsCompose: true,
      },
      data: {
        ok: true,
        target: 'todos',
        action: 'create',
        item: {
          id: 'todo_1',
          type: 'todo',
          title: '买牛奶',
          excerpt: '',
          originalText: '买牛奶 明天上午',
          url: null,
          timeText: '明天上午',
          dueAt: null,
          completed: false,
          createdAt: new Date('2026-05-06T08:00:00.000Z'),
        },
      },
    })

    expect(capturedPayload).not.toBeNull()
    const payload = JSON.parse(capturedPayload!)
    expect(payload.data.item.timeText).toBe('明天上午')
    expect(payload.data.item.dueAt).toBeNull()
  })
})
