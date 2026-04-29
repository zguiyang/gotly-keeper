import { afterEach, describe, expect, it, vi } from 'vitest'

import { planWorkspaceRun } from '@/server/modules/workspace-agent/workspace-run-planner'

afterEach(() => {
  vi.resetModules()
  vi.doUnmock('@/server/lib/prompt-template')
})

describe('workspace-run-planner', () => {
  it('maps clear create note input to a low-risk create_note step without hints', async () => {
    const runPlanHints = vi.fn()

    const result = await planWorkspaceRun({
      userId: 'user_123',
      draftTasks: [
        {
          id: 'draft_1',
          intent: 'create',
          target: 'notes',
          title: '记录会议纪要',
          confidence: 0.93,
          ambiguities: [],
          corrections: [],
          slots: {
            content: '记录会议纪要',
          },
        },
      ],
      searchCandidates: vi.fn(),
      runPlanHints,
    })

    expect(result).toEqual({
      summary: '准备执行 1 个任务。',
      steps: [
        {
          id: 'step_1',
          action: 'create_note',
          target: 'notes',
          title: '记录会议纪要',
          risk: 'low',
          requiresUserApproval: false,
          toolInput: {
            content: '记录会议纪要',
          },
        },
      ],
    })
    expect(runPlanHints).not.toHaveBeenCalled()
  })

  it('maps clear create todo input to a low-risk create_todo step without hints', async () => {
    const runPlanHints = vi.fn()

    const result = await planWorkspaceRun({
      userId: 'user_123',
      draftTasks: [
        {
          id: 'draft_1',
          intent: 'create',
          target: 'todos',
          title: '给客户发报价',
          confidence: 0.95,
          ambiguities: [],
          corrections: [],
          slots: {
            title: '给客户发报价',
            timeText: '明天下午三点',
          },
        },
      ],
      searchCandidates: vi.fn(),
      runPlanHints,
    })

    expect(result.steps).toEqual([
      {
        id: 'step_1',
        action: 'create_todo',
        target: 'todos',
        title: '给客户发报价',
        risk: 'low',
        requiresUserApproval: false,
        toolInput: {
          title: '给客户发报价',
          timeText: '明天下午三点',
        },
      },
    ])
    expect(runPlanHints).not.toHaveBeenCalled()
  })

  it('keeps normalized todo dueAt together with the original timeText', async () => {
    const result = await planWorkspaceRun({
      userId: 'user_123',
      draftTasks: [
        {
          id: 'draft_1',
          intent: 'create',
          target: 'todos',
          title: '发周报',
          confidence: 0.95,
          ambiguities: [],
          corrections: [],
          slots: {
            time: '五分钟后',
            timeText: '五分钟后',
            dueAt: '2026-04-29T02:15:00.000Z',
          },
        },
      ],
      searchCandidates: vi.fn(),
      runPlanHints: vi.fn(),
    })

    expect(result.steps).toEqual([
      {
        id: 'step_1',
        action: 'create_todo',
        target: 'todos',
        title: '发周报',
        risk: 'low',
        requiresUserApproval: false,
        toolInput: {
          title: '发周报',
          timeText: '五分钟后',
          dueAt: '2026-04-29T02:15:00.000Z',
        },
      },
    ])
  })

  it('maps clear create bookmark input to a low-risk create_bookmark step without hints', async () => {
    const runPlanHints = vi.fn()

    const result = await planWorkspaceRun({
      userId: 'user_123',
      draftTasks: [
        {
          id: 'draft_1',
          intent: 'create',
          target: 'bookmarks',
          title: '保存官网定价页',
          confidence: 0.96,
          ambiguities: [],
          corrections: [],
          slots: {
            url: 'https://example.com/pricing',
          },
        },
      ],
      searchCandidates: vi.fn(),
      runPlanHints,
    })

    expect(result.steps).toEqual([
      {
        id: 'step_1',
        action: 'create_bookmark',
        target: 'bookmarks',
        title: '保存官网定价页',
        risk: 'low',
        requiresUserApproval: false,
        toolInput: {
          url: 'https://example.com/pricing',
          title: '保存官网定价页',
        },
      },
    ])
    expect(runPlanHints).not.toHaveBeenCalled()
  })

  it('keeps bookmark summary-like slot data in toolInput for execution', async () => {
    const result = await planWorkspaceRun({
      userId: 'user_123',
      draftTasks: [
        {
          id: 'draft_1',
          intent: 'create',
          target: 'bookmarks',
          title: '保存官网定价页',
          confidence: 0.96,
          ambiguities: [],
          corrections: [],
          slots: {
            url: 'https://example.com/pricing',
            note: '重点看首屏卖点',
          },
        },
      ],
      searchCandidates: vi.fn(),
      runPlanHints: vi.fn(),
    })

    expect(result.steps[0]).toMatchObject({
      action: 'create_bookmark',
      toolInput: {
        url: 'https://example.com/pricing',
        title: '保存官网定价页',
        summary: '重点看首屏卖点',
      },
    })
  })

  it('maps query intent to a low-risk query_assets step without hints', async () => {
    const runPlanHints = vi.fn()

    const result = await planWorkspaceRun({
      userId: 'user_123',
      draftTasks: [
        {
          id: 'draft_1',
          intent: 'query',
          target: 'notes',
          title: '查找本周会议纪要',
          confidence: 0.92,
          ambiguities: [],
          corrections: [],
          slots: {
            query: '会议纪要',
          },
        },
      ],
      searchCandidates: vi.fn(),
      runPlanHints,
    })

    expect(result.steps).toEqual([
      {
        id: 'step_1',
        action: 'query_assets',
        target: 'notes',
        title: '查找本周会议纪要',
        risk: 'low',
        requiresUserApproval: false,
        toolInput: {
          query: '会议纪要',
          subjectHint: '查找本周会议纪要',
        },
      },
    ])
    expect(runPlanHints).not.toHaveBeenCalled()
  })

  it('maps summarize intent to a low-risk summarize_assets step without hints', async () => {
    const runPlanHints = vi.fn()

    const result = await planWorkspaceRun({
      userId: 'user_123',
      draftTasks: [
        {
          id: 'draft_1',
          intent: 'summarize',
          target: 'bookmarks',
          title: '总结最近收藏',
          confidence: 0.9,
          ambiguities: [],
          corrections: [],
          slots: {},
        },
      ],
      searchCandidates: vi.fn(),
      runPlanHints,
    })

    expect(result.steps).toEqual([
      {
        id: 'step_1',
        action: 'summarize_assets',
        target: 'bookmarks',
        title: '总结最近收藏',
        risk: 'low',
        requiresUserApproval: false,
        toolInput: {
          query: '总结最近收藏',
          subjectHint: '总结最近收藏',
        },
      },
    ])
    expect(runPlanHints).not.toHaveBeenCalled()
  })

  it('does read-only candidate discovery for update_todo and marks it as approval-required', async () => {
    const searchCandidates = vi.fn().mockResolvedValue([
      {
        id: 'todo_1',
        type: 'todo',
        title: '给客户发报价',
        confidence: 0.94,
        matchReason: '标题完全匹配',
      },
      {
        id: 'todo_2',
        type: 'todo',
        title: '给客户补材料',
        confidence: 0.82,
        matchReason: '同一客户相关待办',
      },
    ])

    const result = await planWorkspaceRun({
      userId: 'user_123',
      draftTasks: [
        {
          id: 'draft_1',
          intent: 'update',
          target: 'todos',
          title: '把给客户发报价标记完成',
          confidence: 0.86,
          ambiguities: [],
          corrections: [],
          slots: {
            query: '给客户发报价',
            status: 'done',
          },
        },
      ],
      searchCandidates,
      runPlanHints: vi.fn(),
    })

    expect(searchCandidates).toHaveBeenCalledWith({
      userId: 'user_123',
      target: 'todos',
      query: '给客户发报价',
    })
    expect(result.steps[0]).toMatchObject({
      id: 'step_1',
      action: 'update_todo',
      target: 'todos',
      title: '把给客户发报价标记完成',
      risk: 'high',
      requiresUserApproval: true,
      candidates: [
        {
          id: 'todo_1',
          type: 'todo',
          title: '给客户发报价',
          confidence: 0.94,
          matchReason: '标题完全匹配',
        },
        {
          id: 'todo_2',
          type: 'todo',
          title: '给客户补材料',
          confidence: 0.82,
          matchReason: '同一客户相关待办',
        },
      ],
      toolInput: {
        selector: {
          id: 'todo_1',
          query: '给客户发报价',
          subjectHint: '把给客户发报价标记完成',
        },
        patch: {
          status: 'done',
        },
      },
    })
  })

  it('degrades safely when update candidate search throws', async () => {
    const searchCandidates = vi.fn().mockRejectedValue(new Error('search failed'))

    const result = await planWorkspaceRun({
      userId: 'user_123',
      draftTasks: [
        {
          id: 'draft_1',
          intent: 'update',
          target: 'todos',
          title: '把给客户发报价标记完成',
          confidence: 0.86,
          ambiguities: [],
          corrections: [],
          slots: {
            query: '给客户发报价',
            status: 'done',
          },
        },
      ],
      searchCandidates,
      runPlanHints: vi.fn(),
    })

    expect(searchCandidates).toHaveBeenCalledWith({
      userId: 'user_123',
      target: 'todos',
      query: '给客户发报价',
    })
    expect(result.steps[0]).toMatchObject({
      id: 'step_1',
      action: 'update_todo',
      target: 'todos',
      title: '把给客户发报价标记完成',
      risk: 'high',
      requiresUserApproval: true,
      candidates: [],
      toolInput: {
        selector: {
          query: '给客户发报价',
          subjectHint: '把给客户发报价标记完成',
        },
        patch: {
          status: 'done',
        },
      },
    })
  })

  it('does not search candidates for update_todo when query and title are both missing', async () => {
    const searchCandidates = vi.fn()

    const result = await planWorkspaceRun({
      userId: 'user_123',
      draftTasks: [
        {
          id: 'draft_1',
          intent: 'update',
          target: 'todos',
          title: '   ',
          confidence: 0.74,
          ambiguities: ['todo_subject'],
          corrections: [],
          slots: {},
        },
      ],
      searchCandidates,
      runPlanHints: vi.fn().mockResolvedValue({
        action: 'update_todo',
      }),
    })

    expect(searchCandidates).not.toHaveBeenCalled()
    expect(result.steps[0]).toMatchObject({
      id: 'step_1',
      action: 'update_todo',
      target: 'todos',
      risk: 'high',
      requiresUserApproval: true,
      candidates: [],
      toolInput: {
        selector: {},
        patch: {},
      },
    })
  })

  it('uses injected hints only when semantics are ambiguous', async () => {
    const runPlanHints = vi.fn().mockResolvedValue({
      action: 'update_todo',
      title: '把那个待办处理一下',
      query: '那个待办',
      reason: '用户未明确待办标题，需要保留 update_todo 并补查询词',
    })

    const result = await planWorkspaceRun({
      userId: 'user_123',
      draftTasks: [
        {
          id: 'draft_1',
          intent: 'update',
          target: 'todos',
          title: '把那个待办处理一下',
          confidence: 0.71,
          ambiguities: ['todo_subject'],
          corrections: [],
          slots: {},
        },
      ],
      searchCandidates: vi.fn().mockResolvedValue([]),
      runPlanHints,
    })

    expect(runPlanHints).toHaveBeenCalledTimes(1)
    expect(result.steps[0]).toMatchObject({
      action: 'update_todo',
      target: 'todos',
      title: '把那个待办处理一下',
      risk: 'high',
      requiresUserApproval: true,
    })
  })

  it('falls back safely when hints return an empty object', async () => {
    const runPlanHints = vi.fn().mockResolvedValue({})

    const result = await planWorkspaceRun({
      userId: 'user_123',
      draftTasks: [
        {
          id: 'draft_1',
          intent: 'create',
          target: 'mixed',
          title: '帮我处理一下这个链接',
          confidence: 0.72,
          ambiguities: ['target'],
          corrections: [],
          slots: {
            url: 'https://example.com/pricing',
            note: '以后要看',
          },
        },
      ],
      searchCandidates: vi.fn(),
      runPlanHints,
    })

    expect(runPlanHints).toHaveBeenCalledTimes(1)
    expect(result.steps).toEqual([
      {
        id: 'step_1',
        action: 'query_assets',
        target: 'mixed',
        title: '帮我处理一下这个链接',
        risk: 'high',
        requiresUserApproval: true,
      },
    ])
  })

  it('uses hints for mixed target plus url input and routes it to create_bookmark', async () => {
    const runPlanHints = vi.fn().mockResolvedValue({
      action: 'create_bookmark',
      title: '保存官网定价页',
      reason: '任务包含 URL，且意图是保存链接',
    })

    const result = await planWorkspaceRun({
      userId: 'user_123',
      draftTasks: [
        {
          id: 'draft_1',
          intent: 'create',
          target: 'mixed',
          title: '把这个留一下',
          confidence: 0.72,
          ambiguities: [],
          corrections: [],
          slots: {
            url: 'https://example.com/pricing',
            note: '以后要看',
          },
        },
      ],
      searchCandidates: vi.fn(),
      runPlanHints,
    })

    expect(runPlanHints).toHaveBeenCalledTimes(1)
    expect(result.steps).toEqual([
      {
        id: 'step_1',
        action: 'create_bookmark',
        target: 'bookmarks',
        title: '保存官网定价页',
        risk: 'low',
        requiresUserApproval: false,
        toolInput: {
          url: 'https://example.com/pricing',
          title: '保存官网定价页',
          summary: '以后要看',
        },
      },
    ])
  })

  it('keeps mixed target for read hints when target is still unclear', async () => {
    const runPlanHints = vi.fn().mockResolvedValue({
      action: 'query_assets',
      title: '查一下这个内容',
      reason: '用户要查内容，但没有明确是笔记、待办还是书签',
    })

    const result = await planWorkspaceRun({
      userId: 'user_123',
      draftTasks: [
        {
          id: 'draft_1',
          intent: 'query',
          target: 'mixed',
          title: '查一下这个内容',
          confidence: 0.73,
          ambiguities: [],
          corrections: [],
          slots: {
            query: '这个内容',
          },
        },
      ],
      searchCandidates: vi.fn(),
      runPlanHints,
    })

    expect(result.steps).toEqual([
      {
        id: 'step_1',
        action: 'query_assets',
        target: 'mixed',
        title: '查一下这个内容',
        risk: 'high',
        requiresUserApproval: true,
        toolInput: {
          query: '这个内容',
          subjectHint: '查一下这个内容',
        },
      },
    ])
  })

  it('falls back to deterministic path when runPlanHints throws', async () => {
    const runPlanHints = vi.fn().mockRejectedValue(new Error('hint failed'))

    const result = await planWorkspaceRun({
      userId: 'user_123',
      draftTasks: [
        {
          id: 'draft_1',
          intent: 'query',
          target: 'mixed',
          title: '查一下这个内容',
          confidence: 0.73,
          ambiguities: [],
          corrections: [],
          slots: {
            query: '这个内容',
          },
        },
      ],
      searchCandidates: vi.fn(),
      runPlanHints,
    })

    expect(runPlanHints).toHaveBeenCalledTimes(1)
    expect(result.steps).toEqual([
      {
        id: 'step_1',
        action: 'query_assets',
        target: 'mixed',
        title: '查一下这个内容',
        risk: 'high',
        requiresUserApproval: true,
      },
    ])
  })

  it('ignores malformed hint payload fields without throwing', async () => {
    const runPlanHints = vi.fn().mockResolvedValue({
      action: 'query_assets',
      title: 123,
      query: ['bad'],
      reason: { nope: true },
    })

    const result = await planWorkspaceRun({
      userId: 'user_123',
      draftTasks: [
        {
          id: 'draft_1',
          intent: 'query',
          target: 'mixed',
          title: '查一下这个内容',
          confidence: 0.73,
          ambiguities: [],
          corrections: [],
          slots: {
            query: '这个内容',
          },
        },
      ],
      searchCandidates: vi.fn(),
      runPlanHints,
    })

    expect(result.steps).toEqual([
      {
        id: 'step_1',
        action: 'query_assets',
        target: 'mixed',
        title: '查一下这个内容',
        risk: 'high',
        requiresUserApproval: true,
        toolInput: {
          query: '这个内容',
          subjectHint: '查一下这个内容',
        },
      },
    ])
  })

  it('falls back to deterministic path when prompt render fails', async () => {
    vi.doMock('@/server/lib/prompt-template', () => ({
      renderPrompt: vi.fn().mockRejectedValue(new Error('render failed')),
    }))

    const { planWorkspaceRun: mockedPlanWorkspaceRun } = await import(
      '@/server/modules/workspace-agent/workspace-run-planner'
    )

    const result = await mockedPlanWorkspaceRun({
      userId: 'user_123',
      draftTasks: [
        {
          id: 'draft_1',
          intent: 'query',
          target: 'mixed',
          title: '查一下这个内容',
          confidence: 0.73,
          ambiguities: [],
          corrections: [],
          slots: {
            query: '这个内容',
          },
        },
      ],
      searchCandidates: vi.fn(),
      runPlanHints: vi.fn(),
    })

    expect(result.steps).toEqual([
      {
        id: 'step_1',
        action: 'query_assets',
        target: 'mixed',
        title: '查一下这个内容',
        risk: 'high',
        requiresUserApproval: true,
      },
    ])
  })
})
