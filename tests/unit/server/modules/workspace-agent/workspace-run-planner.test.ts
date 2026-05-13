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
          createPayload: {
            content: '记录会议纪要',
          },
          toolInput: {
            content: '记录会议纪要',
          },
        },
      ],
    })
    expect(runPlanHints).not.toHaveBeenCalled()
  })

  it('prefers clean note content over raw command-prefixed text when building create payloads', async () => {
    const result = await planWorkspaceRun({
      userId: 'user_123',
      draftTasks: [
        {
          id: 'draft_1',
          intent: 'create',
          target: 'notes',
          title: '再记一下：RQA0507H 这个结论要同步一下',
          cleanTitle: 'RQA0507H 这个结论要同步一下',
          cleanContent: 'RQA0507H 这个结论要同步一下',
          captureMode: 'note_capture',
          clarifyReason: 'none',
          repeatRelation: 'independent',
          targetConfidence: 0.95,
          confidence: 0.93,
          ambiguities: [],
          corrections: [],
          slots: {
            content: '再记一下：RQA0507H 这个结论要同步一下',
          },
        },
      ],
      searchCandidates: vi.fn(),
      runPlanHints: vi.fn(),
    })

    expect(result.steps[0]).toMatchObject({
      action: 'create_note',
      title: 'RQA0507H 这个结论要同步一下',
      createPayload: {
        content: 'RQA0507H 这个结论要同步一下',
      },
      toolInput: {
        content: 'RQA0507H 这个结论要同步一下',
      },
    })
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
        createPayload: {
          title: '给客户发报价',
          timeText: '明天下午三点',
        },
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
        createPayload: {
          title: '发周报',
          timeText: '五分钟后',
          dueAt: '2026-04-29T02:15:00.000Z',
        },
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
        createPayload: {
          url: 'https://example.com/pricing',
          title: '保存官网定价页',
        },
        toolInput: {
          url: 'https://example.com/pricing',
          title: '保存官网定价页',
        },
      },
    ])
    expect(runPlanHints).not.toHaveBeenCalled()
  })

  it('keeps bookmark summary-like slot data in toolInput for execution', async () => {
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
            note: '重点看首屏卖点',
          },
        },
      ],
      searchCandidates: vi.fn(),
      runPlanHints,
    })

    expect(result.steps[0]).toMatchObject({
      action: 'create_bookmark',
      toolInput: {
        url: 'https://example.com/pricing',
        title: '保存官网定价页',
        note: '重点看首屏卖点',
      },
    })
    expect(runPlanHints).not.toHaveBeenCalled()
  })

  it('preserves bookmark note and summary separately when both are available', async () => {
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
            note: '回头发给客户',
            summary: '产品定价说明',
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
        note: '回头发给客户',
        summary: '产品定价说明',
      },
    })
  })

  it('maps recency semantic to selector constraints in query_assets', async () => {
    const result = await planWorkspaceRun({
      userId: 'user_123',
      draftTasks: [
        {
          id: 'draft_1',
          intent: 'query',
          target: 'todos',
          title: '报价',
          confidence: 0.92,
          ambiguities: [],
          corrections: [],
          slots: {
            query: '报价',
            timeRange: 'recent',
          },
        },
      ],
      searchCandidates: vi.fn(),
      runPlanHints: vi.fn(),
    })

    const step = result.steps[0]
    expect(step.selector).toMatchObject({
      target: 'todos',
      subject: '报价',
      timeConstraint: { kind: 'recent', strength: 'soft' },
      sort: 'recent_first',
    })
    expect(step.toolInput?.recentFocus).toBe(true)
    expect(step.toolInput?.limit).toBe(10)
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

    expect(result.steps[0]).toMatchObject({
      id: 'step_1',
      action: 'query_assets',
      target: 'notes',
      title: '查找本周会议纪要',
      risk: 'low',
      requiresUserApproval: false,
      toolInput: {
        query: '会议纪要',
        subjectHint: '会议纪要',
      },
    })
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

    expect(result.steps[0]).toMatchObject({
      id: 'step_1',
      action: 'summarize_assets',
      target: 'bookmarks',
      title: '总结最近收藏',
      risk: 'low',
      requiresUserApproval: false,
      toolInput: {
        query: null,
        subjectHint: null,
      },
    })
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
      status: 'open',
      keywords: ['给客户发报价'],
      timeConstraint: null,
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
      status: 'open',
      keywords: ['给客户发报价'],
      timeConstraint: null,
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

  it('does not let hints rewrite explicit note capture tasks into todos', async () => {
    const runPlanHints = vi.fn().mockResolvedValue({
      action: 'create_todo',
      title: 'RQA0507H 这个结论要同步一下',
      reason: '内容带有动作色彩',
    })

    const result = await planWorkspaceRun({
      userId: 'user_123',
      draftTasks: [
        {
          id: 'draft_1',
          intent: 'create',
          target: 'notes',
          title: 'RQA0507H 这个结论要同步一下',
          confidence: 0.74,
          ambiguities: ['capture_wording'],
          corrections: [],
          slots: {
            content: 'RQA0507H 这个结论要同步一下',
          },
        },
      ],
      searchCandidates: vi.fn(),
      runPlanHints,
    })

    expect(runPlanHints).not.toHaveBeenCalled()
    expect(result.steps).toEqual([
      {
        id: 'step_1',
        action: 'create_note',
        target: 'notes',
        title: 'RQA0507H 这个结论要同步一下',
        risk: 'low',
        requiresUserApproval: false,
        createPayload: {
          content: 'RQA0507H 这个结论要同步一下',
        },
        toolInput: {
          content: 'RQA0507H 这个结论要同步一下',
        },
      },
    ])
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
      expect.objectContaining({
        id: 'step_1',
        action: 'query_assets',
        target: 'mixed',
        title: '帮我处理一下这个链接',
        risk: 'high',
        requiresUserApproval: true,
      }),
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
        createPayload: {
          url: 'https://example.com/pricing',
          title: '保存官网定价页',
          note: '以后要看',
        },
        toolInput: {
          url: 'https://example.com/pricing',
          title: '保存官网定价页',
          note: '以后要看',
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

    expect(result.steps[0]).toMatchObject({
      id: 'step_1',
      action: 'query_assets',
      target: 'mixed',
      title: '查一下这个内容',
      risk: 'low',
      requiresUserApproval: false,
      toolInput: {
        query: '这个内容',
        subjectHint: '这个内容',
      },
    })
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
    expect(result.steps[0]).toMatchObject({
      id: 'step_1',
      action: 'query_assets',
      target: 'mixed',
      title: '查一下这个内容',
      risk: 'low',
      requiresUserApproval: false,
    })
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

    expect(result.steps[0]).toMatchObject({
      id: 'step_1',
      action: 'query_assets',
      target: 'mixed',
      title: '查一下这个内容',
      risk: 'low',
      requiresUserApproval: false,
      toolInput: {
        query: '这个内容',
        subjectHint: '这个内容',
      },
    })
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
      expect.objectContaining({
        id: 'step_1',
        action: 'query_assets',
        target: 'mixed',
        title: '查一下这个内容',
        risk: 'low',
        requiresUserApproval: false,
      }),
    ])
  })

  // ── Read Risk Assessment Matrix ─────────────────────────────────────

  it('query + mixed + recent + subject clear → low risk, no approval', async () => {
    const result = await planWorkspaceRun({
      userId: 'user_123',
      draftTasks: [{
        id: 'task_1',
        intent: 'query',
        target: 'mixed',
        title: 'QA20260506 内容',
        confidence: 0.9,
        ambiguities: [],
        corrections: [],
        slots: { query: 'QA20260506', timeRange: 'recent' },
      }],
      searchCandidates: vi.fn(),
      runPlanHints: vi.fn(),
    })

    const step = result.steps[0]
    expect(step.action).toBe('query_assets')
    expect(step.target).toBe('mixed')
    expect(step.risk).toBe('low')
    expect(step.requiresUserApproval).toBe(false)
    expect(step.selector?.subject).toBe('QA20260506')
    expect(step.selector?.timeConstraint?.kind).toBe('recent')
  })

  it('summarize + mixed + recent + subject clear → low risk, no approval', async () => {
    const result = await planWorkspaceRun({
      userId: 'user_123',
      draftTasks: [{
        id: 'task_1',
        intent: 'summarize',
        target: 'mixed',
        title: 'QA20260506',
        confidence: 0.85,
        ambiguities: [],
        corrections: [],
        slots: { query: 'QA20260506', timeRange: 'recent' },
      }],
      searchCandidates: vi.fn(),
      runPlanHints: vi.fn(),
    })

    const step = result.steps[0]
    expect(step.action).toBe('summarize_assets')
    expect(step.target).toBe('mixed')
    expect(step.risk).toBe('low')
    expect(step.requiresUserApproval).toBe(false)
    expect(step.selector?.subject).toBe('QA20260506')
    expect(step.selector?.timeConstraint?.kind).toBe('recent')
  })

  it('query + mixed + no subject + no time → high risk, needs approval', async () => {
    const result = await planWorkspaceRun({
      userId: 'user_123',
      draftTasks: [{
        id: 'task_1',
        intent: 'query',
        target: 'mixed',
        title: '看看最近都存了什么',
        confidence: 0.5,
        ambiguities: ['范围"最近都存了什么"不够具体'],
        corrections: [],
        slots: {},
      }],
      searchCandidates: vi.fn(),
      runPlanHints: vi.fn(),
    })

    const step = result.steps[0]
    expect(step.action).toBe('query_assets')
    expect(step.target).toBe('mixed')
    expect(step.risk).toBe('high')
    expect(step.requiresUserApproval).toBe(true)
  })

  it('summarize + mixed + broad intent → high risk, needs approval', async () => {
    const result = await planWorkspaceRun({
      userId: 'user_123',
      draftTasks: [{
        id: 'task_1',
        intent: 'summarize',
        target: 'mixed',
        title: '所有东西',
        confidence: 0.55,
        ambiguities: [],
        corrections: [],
        slots: {},
      }],
      searchCandidates: vi.fn(),
      runPlanHints: vi.fn(),
    })

    const step = result.steps[0]
    expect(step.action).toBe('summarize_assets')
    expect(step.target).toBe('mixed')
    expect(step.risk).toBe('high')
    expect(step.requiresUserApproval).toBe(true)
  })

  it('summarize + mixed + generic recent summary → low risk recent retrieval without subject query', async () => {
    const result = await planWorkspaceRun({
      userId: 'user_123',
      draftTasks: [{
        id: 'task_1',
        intent: 'summarize',
        target: 'mixed',
        title: '最近记录',
        confidence: 0.95,
        ambiguities: [],
        corrections: [],
        slots: { timeRange: 'recent' },
      }],
      searchCandidates: vi.fn(),
      runPlanHints: vi.fn(),
    })

    const step = result.steps[0]
    expect(step.action).toBe('summarize_assets')
    expect(step.target).toBe('mixed')
    expect(step.selector?.subject).toBeUndefined()
    expect(step.selector?.keywords).toBeUndefined()
    expect(step.selector?.timeConstraint?.kind).toBe('recent')
    expect(step.selector?.sort).toBe('recent_first')
    expect(step.selector?.limit).toBe(8)
    expect(step.risk).toBe('low')
    expect(step.requiresUserApproval).toBe(false)
  })

  // ── Regression: Representative Utterances ───────────────────────────
  // These test cases reflect the refactored pipeline semantics.
  // They verify that query, summarize, and update share one selector path.

  it('帮我找一下刚刚记的报价待办 → query, todos, recency constraint', async () => {
    const result = await planWorkspaceRun({
      userId: 'user_123',
      draftTasks: [{
        id: 'task_1',
        intent: 'query',
        target: 'todos',
        title: '报价',
        confidence: 0.9,
        ambiguities: [],
        corrections: [],
        slots: { query: '报价', timeRange: 'recent' },
      }],
      searchCandidates: vi.fn(),
      runPlanHints: vi.fn(),
    })

    const step = result.steps[0]
    expect(step.action).toBe('query_assets')
    expect(step.target).toBe('todos')
    expect(step.selector).toBeDefined()
    expect(step.selector?.timeConstraint?.kind).toBe('recent')
    expect(step.selector?.sort).toBe('recent_first')
    expect(step.selector?.subject).toBe('报价')
    expect(step.requiresUserApproval).toBe(false)
  })

  it('帮我总结一下最近的报价相关内容 → summarize, mixed, soft recency', async () => {
    const result = await planWorkspaceRun({
      userId: 'user_123',
      draftTasks: [{
        id: 'task_1',
        intent: 'summarize',
        target: 'mixed',
        title: '报价',
        confidence: 0.85,
        ambiguities: [],
        corrections: [],
        slots: { query: '报价', timeRange: 'recent' },
      }],
      searchCandidates: vi.fn(),
      runPlanHints: vi.fn(),
    })

    const step = result.steps[0]
    expect(step.action).toBe('summarize_assets')
    expect(step.target).toBe('mixed')
    expect(step.selector).toBeDefined()
    expect(step.selector?.timeConstraint?.kind).toBe('recent')
    expect(step.selector?.subject).toBe('报价')
    expect(step.risk).toBe('low')
    expect(step.requiresUserApproval).toBe(false)
  })

  it('把报价待办标记为已完成 → update, todos, status done', async () => {
    const searchCandidates = vi.fn().mockResolvedValue([{
      id: 'todo_1',
      type: 'todo',
      title: '报价',
      confidence: 0.9,
      matchReason: '标题匹配',
    }])

    const result = await planWorkspaceRun({
      userId: 'user_123',
      draftTasks: [{
        id: 'task_1',
        intent: 'update',
        target: 'todos',
        title: '报价',
        confidence: 0.9,
        ambiguities: [],
        corrections: [],
        slots: { query: '报价', status: 'done' },
      }],
      searchCandidates,
      runPlanHints: vi.fn(),
    })

    const step = result.steps[0]
    expect(step.action).toBe('update_todo')
    expect(step.target).toBe('todos')
    expect(step.selector).toBeDefined()
    expect(step.selector?.subject).toBe('报价')
    expect(step.patch).toBeDefined()
    expect(step.patch?.status).toBe('done')
    expect(step.toolInput?.patch).toMatchObject({ status: 'done' })
  })

  it('查十分钟内记的笔记 → query, notes, relative_window time constraint', async () => {
    const result = await planWorkspaceRun({
      userId: 'user_123',
      draftTasks: [{
        id: 'task_1',
        intent: 'query',
        target: 'notes',
        title: '笔记',
        confidence: 0.85,
        ambiguities: [],
        corrections: [],
        slots: { timeText: '十分钟内' },
      }],
      searchCandidates: vi.fn(),
      runPlanHints: vi.fn(),
    })

    const step = result.steps[0]
    expect(step.action).toBe('query_assets')
    expect(step.target).toBe('notes')
    expect(step.selector).toBeDefined()
    expect(step.selector?.target).toBe('notes')
    expect(step.selector?.timeConstraint).toMatchObject({
      kind: 'relative_window',
      anchor: 'now',
      direction: 'past',
      unit: 'minute',
      value: 10,
      strength: 'hard',
    })
  })

  it('create_note does NOT get a selector (only read paths)', async () => {
    const result = await planWorkspaceRun({
      userId: 'user_123',
      draftTasks: [{
        id: 'task_1',
        intent: 'create',
        target: 'notes',
        title: '测试笔记',
        confidence: 0.95,
        ambiguities: [],
        corrections: [],
        slots: { content: '测试笔记' },
      }],
      searchCandidates: vi.fn(),
      runPlanHints: vi.fn(),
    })

    const step = result.steps[0]
    expect(step.action).toBe('create_note')
    expect(step.selector).toBeUndefined()
    expect(step.createPayload).toBeDefined()
  })
})
