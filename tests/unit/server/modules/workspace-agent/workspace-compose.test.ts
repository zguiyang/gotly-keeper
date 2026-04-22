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
})
