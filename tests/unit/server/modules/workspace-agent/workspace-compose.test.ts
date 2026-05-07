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

  it('includes mixed summary counts and per-type groups in compose prompt payload', async () => {
    mocks.runAiGeneration.mockResolvedValue({
      success: true,
      data: {
        answer: '最近有 1 条待办、1 条笔记和 1 条书签。',
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
      task: { intent: 'summarize', target: 'mixed' },
      plan: {
        intent: 'summarize',
        target: 'mixed',
        toolName: 'search_mixed_assets',
        toolInput: {},
        needsCompose: true,
      },
      data: {
        ok: true,
        target: 'mixed',
        items: [
          {
            id: 'todo_1',
            type: 'todo',
            title: '跟进验收结论',
            excerpt: '今晚同步结果',
            originalText: '今晚同步结果',
            url: null,
            timeText: '今晚',
            dueAt: null,
            completed: false,
            createdAt: new Date('2026-05-07T08:00:00.000Z'),
          },
          {
            id: 'note_1',
            type: 'note',
            title: 'RQA0507 用户反馈',
            excerpt: '一句话保存更自然',
            originalText: '一句话保存更自然',
            url: null,
            timeText: null,
            dueAt: null,
            completed: false,
            createdAt: new Date('2026-05-07T08:05:00.000Z'),
          },
          {
            id: 'bookmark_1',
            type: 'link',
            title: '复测链接',
            excerpt: 'https://example.com/rqa0507',
            originalText: 'https://example.com/rqa0507',
            url: 'https://example.com/rqa0507',
            timeText: null,
            dueAt: null,
            completed: false,
            createdAt: new Date('2026-05-07T08:10:00.000Z'),
          },
        ],
        total: 3,
      },
    })

    expect(capturedPayload).not.toBeNull()
    const payload = JSON.parse(capturedPayload!)
    expect(payload.summaryContext).toEqual({
      counts: {
        todos: 1,
        notes: 1,
        bookmarks: 1,
      },
      groups: {
        todos: [expect.objectContaining({ id: 'todo_1', type: 'todo' })],
        notes: [expect.objectContaining({ id: 'note_1', type: 'note' })],
        bookmarks: [expect.objectContaining({ id: 'bookmark_1', type: 'link' })],
      },
    })
  })

  it('builds T09 acceptance summary context with separate todo, note, and bookmark groups', async () => {
    mocks.runAiGeneration.mockResolvedValue({
      success: true,
      data: {
        answer: '最近有 1 条待办、2 条笔记和 1 条书签。',
      },
    })

    let capturedPayload: string | null = null
    mocks.renderPrompt.mockImplementation(
      async (_template: string, vars: Record<string, string>) => {
        capturedPayload = vars.payloadJson
        return 'user prompt'
      }
    )

    const result = await composeWorkspaceAnswer({
      task: { intent: 'summarize', target: 'mixed' },
      plan: {
        intent: 'summarize',
        target: 'mixed',
        toolName: 'search_mixed_assets',
        toolInput: {
          query: 'RQA0507',
        },
        needsCompose: true,
      },
      data: {
        ok: true,
        target: 'mixed',
        items: [
          {
            id: 'todo_1',
            type: 'todo',
            title: '给验收群发本轮测试结论 RQA0507A',
            excerpt: '给验收群发本轮测试结论',
            originalText: '给验收群发本轮测试结论 RQA0507A',
            url: null,
            timeText: '5月7日下午6点',
            dueAt: null,
            completed: false,
            createdAt: new Date('2026-05-07T08:00:00.000Z'),
          },
          {
            id: 'note_1',
            type: 'note',
            title: '真实用户验收笔记 RQA0507B',
            excerpt: '小白会希望一句话就直接保存',
            originalText: '真实用户验收笔记 RQA0507B 小白会希望一句话就直接保存',
            url: null,
            timeText: null,
            dueAt: null,
            completed: false,
            createdAt: new Date('2026-05-07T08:01:00.000Z'),
          },
          {
            id: 'note_2',
            type: 'note',
            title: 'RQA0507E 小白用户会连续说两件事，不会先想类型',
            excerpt: '小白用户会连续说两件事，不会先想类型',
            originalText: 'RQA0507E 小白用户会连续说两件事，不会先想类型',
            url: null,
            timeText: null,
            dueAt: null,
            completed: false,
            createdAt: new Date('2026-05-07T08:02:00.000Z'),
          },
          {
            id: 'bookmark_1',
            type: 'link',
            title: 'RQA0507C 复测回看链接',
            excerpt: 'https://example.com/rqa0507c',
            originalText: 'https://example.com/rqa0507c',
            url: 'https://example.com/rqa0507c',
            timeText: null,
            dueAt: null,
            completed: false,
            createdAt: new Date('2026-05-07T08:03:00.000Z'),
          },
        ],
        total: 4,
      },
    })

    expect(result).toEqual({
      answer: '最近有 1 条待办、2 条笔记和 1 条书签。',
      usedFallback: false,
    })

    expect(capturedPayload).not.toBeNull()
    const payload = JSON.parse(capturedPayload!)
    expect(payload.summaryContext.counts).toEqual({
      todos: 1,
      notes: 2,
      bookmarks: 1,
    })
    expect(payload.summaryContext.groups.todos.map((item: { id: string }) => item.id)).toEqual(['todo_1'])
    expect(payload.summaryContext.groups.notes.map((item: { id: string }) => item.id)).toEqual(['note_1', 'note_2'])
    expect(payload.summaryContext.groups.bookmarks.map((item: { id: string }) => item.id)).toEqual(['bookmark_1'])
  })
})
