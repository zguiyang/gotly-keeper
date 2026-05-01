import { describe, expect, it } from 'vitest'

import {
  reviewWorkspaceRunPlan,
  type ReviewableDraftTask,
  type ReviewablePlan,
  type ReviewWorkspaceRunPlanDecision,
} from '@/server/modules/workspace-agent/workspace-run-review'

import type {
  DraftWorkspaceTask,
  WorkspaceUnderstandingPreview,
} from '@/shared/workspace/workspace-run-protocol'

function createDraftTask(overrides: Partial<ReviewableDraftTask> = {}): ReviewableDraftTask {
  return {
    id: 'draft_1',
    intent: 'create',
    target: 'todos',
    title: '给客户发报价',
    confidence: 0.92,
    ambiguities: [],
    corrections: [],
    slots: {
      title: '给客户发报价',
    },
    ...overrides,
  }
}

function createPlan(overrides: Partial<ReviewablePlan> = {}): ReviewablePlan {
  return {
    summary: '准备执行 1 个任务。',
    steps: [
      {
        id: 'step_1',
        action: 'create_todo',
        target: 'todos',
        title: '给客户发报价',
        risk: 'low',
        requiresUserApproval: false,
      },
    ],
    ...overrides,
  }
}

function createUnderstandingPreview(
  overrides: Partial<Omit<WorkspaceUnderstandingPreview, 'draftTasks'>> & {
    draftTasks?: ReviewableDraftTask[]
  } = {}
): WorkspaceUnderstandingPreview {
  const { draftTasks, ...rest } = overrides

  return {
    rawInput: '给客户发报价',
    normalizedInput: '给客户发报价',
    draftTasks: (draftTasks ?? [createDraftTask()]).map(toPreviewDraftTask),
    corrections: [],
    ...rest,
  }
}

function toPreviewDraftTask(task: ReviewableDraftTask): DraftWorkspaceTask {
  return {
    id: task.id,
    intent: task.intent,
    target: task.target,
    title: task.title ?? '',
    confidence: task.confidence,
    ambiguities: task.ambiguities,
    corrections: task.corrections,
    slots: Object.fromEntries(
      Object.entries(task.slots).filter((entry): entry is [string, string] => typeof entry[1] === 'string')
    ),
  }
}

function expectAwaitUser(
  result: ReviewWorkspaceRunPlanDecision
): Extract<ReviewWorkspaceRunPlanDecision, { status: 'await_user' }> {
  expect(result.status).toBe('await_user')
  if (result.status !== 'await_user') {
    throw new Error(`Expected await_user result, received ${result.status}`)
  }

  return result
}

const updatedAt = '2026-04-27T12:00:00.000Z'

describe('workspace-run-review', () => {
  it('awaits user edit when more than one draft task exists', () => {
    const draftTasks = [
      createDraftTask({ slots: { title: '给客户发报价', done: true, count: 2 } as Record<string, unknown> }),
      createDraftTask({ id: 'draft_2', title: undefined }),
    ]

    const result = reviewWorkspaceRunPlan({
      runId: 'run_1',
      draftTasks,
      plan: createPlan({
        summary: '准备执行 2 个任务。',
        steps: [
          {
            id: 'step_1',
            action: 'create_todo',
            target: 'todos',
            title: '给客户发报价',
            risk: 'low',
            requiresUserApproval: false,
          },
          {
            id: 'step_2',
            action: 'create_bookmark',
            target: 'bookmarks',
            title: '',
            risk: 'low',
            requiresUserApproval: false,
          },
        ],
      }),
      understandingPreview: createUnderstandingPreview({ draftTasks }),
      updatedAt,
    })

    const awaitUser = expectAwaitUser(result)
    expect(awaitUser.reason).toBe('edit_draft_tasks')
    expect(awaitUser.snapshot.interaction).toMatchObject({
      type: 'edit_draft_tasks',
      actions: ['save', 'cancel'],
    })
    expect(awaitUser.snapshot.interaction.type).toBe('edit_draft_tasks')
    if (awaitUser.snapshot.interaction.type === 'edit_draft_tasks') {
      expect(awaitUser.snapshot.interaction.tasks).toEqual([
        expect.objectContaining({ title: '给客户发报价', slots: { title: '给客户发报价' } }),
        expect.objectContaining({ title: '' }),
      ])
    }
  })

  it('requests plan confirmation after multi-task drafts are already confirmed', () => {
    const draftTasks = [
      createDraftTask({
        id: 'task_1',
        title: '熬药',
        confidence: 0.95,
        slots: { time: '五分钟后' },
      }),
      createDraftTask({
        id: 'task_2',
        target: 'notes',
        title: '不要吃生冷食物',
        confidence: 0.9,
        slots: {},
      }),
    ]

    const result = reviewWorkspaceRunPlan({
      runId: 'run_1',
      draftTasks,
      plan: createPlan({
        summary: '准备执行 2 个任务。',
        steps: [
          {
            id: 'step_1',
            action: 'create_todo',
            target: 'todos',
            title: '熬药',
            risk: 'low',
            requiresUserApproval: false,
          },
          {
            id: 'step_2',
            action: 'create_note',
            target: 'notes',
            title: '不要吃生冷食物',
            risk: 'low',
            requiresUserApproval: false,
          },
        ],
      }),
      understandingPreview: createUnderstandingPreview({ draftTasks }),
      updatedAt,
      draftTasksConfirmed: true,
    })

    const awaitUser = expectAwaitUser(result)
    expect(awaitUser.reason).toBe('confirm_plan')
    expect(awaitUser.snapshot.interaction).toMatchObject({
      type: 'confirm_plan',
      actions: ['confirm', 'edit', 'cancel'],
    })
  })

  it('requests candidate selection for update steps with candidates', () => {
    const draftTask = createDraftTask({
      intent: 'update',
      target: 'todos',
      title: '把给客户发报价标记完成',
    })

    const result = reviewWorkspaceRunPlan({
      runId: 'run_1',
      draftTasks: [draftTask],
      plan: createPlan({
        steps: [
          {
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
          },
        ],
      }),
      understandingPreview: createUnderstandingPreview({ draftTasks: [draftTask] }),
      updatedAt,
    })

    const awaitUser = expectAwaitUser(result)
    expect(awaitUser.reason).toBe('select_candidate')
    expect(awaitUser.snapshot.interaction).toMatchObject({
      type: 'select_candidate',
      target: 'todo',
      actions: ['select', 'skip', 'cancel'],
    })
  })

  it('requests duplicate confirmation for single create steps with duplicate hits', () => {
    const draftTask = createDraftTask({
      target: 'todos',
      title: '给客户发报价',
      slots: {
        title: '给客户发报价',
        timeText: '明天下午',
      },
    })

    const result = reviewWorkspaceRunPlan({
      runId: 'run_1',
      draftTasks: [draftTask],
      plan: createPlan({
        steps: [
          {
            id: 'step_1',
            action: 'create_todo',
            target: 'todos',
            title: '给客户发报价',
            risk: 'low',
            requiresUserApproval: false,
          },
        ],
      }),
      understandingPreview: createUnderstandingPreview({ draftTasks: [draftTask] }),
      updatedAt,
      duplicateCandidates: [
        {
          stepId: 'step_1',
          target: 'todo',
          duplicates: [
            {
              id: 'todo_1',
              label: '给客户发报价',
              reason: '标题和时间完全一致',
            },
          ],
        },
      ],
    })

    const awaitUser = expectAwaitUser(result)
    expect(awaitUser.reason).toBe('confirm_duplicate')
    expect(awaitUser.snapshot.interaction).toMatchObject({
      type: 'confirm_duplicate',
      target: 'todo',
      actions: ['create', 'skip', 'cancel'],
      current: {
        stepId: 'step_1',
        title: '给客户发报价',
      },
    })
  })

  it('prioritizes multi-task draft editing before duplicate confirmation', () => {
    const draftTasks = [
      createDraftTask({
        id: 'task_1',
        target: 'todos',
        title: '给客户发报价',
        slots: { title: '给客户发报价' },
      }),
      createDraftTask({
        id: 'task_2',
        target: 'notes',
        title: '记录会议纪要',
        slots: {},
      }),
    ]

    const result = reviewWorkspaceRunPlan({
      runId: 'run_1',
      draftTasks,
      plan: createPlan({
        summary: '准备执行 2 个任务。',
        steps: [
          {
            id: 'step_1',
            action: 'create_todo',
            target: 'todos',
            title: '给客户发报价',
            risk: 'low',
            requiresUserApproval: false,
          },
          {
            id: 'step_2',
            action: 'create_note',
            target: 'notes',
            title: '记录会议纪要',
            risk: 'low',
            requiresUserApproval: false,
          },
        ],
      }),
      understandingPreview: createUnderstandingPreview({ draftTasks }),
      updatedAt,
      duplicateCandidates: [
        {
          stepId: 'step_1',
          target: 'todo',
          duplicates: [
            {
              id: 'todo_1',
              label: '给客户发报价',
              reason: '标题完全一致',
            },
          ],
        },
      ],
    })

    const awaitUser = expectAwaitUser(result)
    expect(awaitUser.reason).toBe('edit_draft_tasks')
  })

  it('does not ask candidate selection when update has only one candidate', () => {
    const draftTask = createDraftTask({
      intent: 'update',
      target: 'todos',
      title: '把给客户发报价标记完成',
    })

    const result = reviewWorkspaceRunPlan({
      runId: 'run_1',
      draftTasks: [draftTask],
      plan: createPlan({
        steps: [
          {
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
            ],
          },
        ],
      }),
      understandingPreview: createUnderstandingPreview({ draftTasks: [draftTask] }),
      updatedAt,
    })

    const awaitUser = expectAwaitUser(result)
    expect(awaitUser.reason).toBe('confirm_plan')
    expect(awaitUser.snapshot.interaction).toMatchObject({
      type: 'confirm_plan',
      actions: ['confirm', 'edit', 'cancel'],
    })
    expect(awaitUser.snapshot.interaction.message).toContain('给客户发报价')
    expect(awaitUser.snapshot.preview).toMatchObject({
      plan: expect.any(Object),
    })
  })

  it('rejects before update candidate flow when task and update step are inconsistent', () => {
    const result = reviewWorkspaceRunPlan({
      runId: 'run_1',
      draftTasks: [
        createDraftTask({
          intent: 'create',
          target: 'todos',
          title: '给客户发报价',
        }),
      ],
      plan: createPlan({
        steps: [
          {
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
            ],
          },
        ],
      }),
      understandingPreview: createUnderstandingPreview(),
      updatedAt,
    })

    expect(result).toEqual({
      status: 'reject',
      reason: 'invalid_plan',
    })
  })

  it('rejects inconsistent non-update step before asking for missing fields', () => {
    const draftTask = createDraftTask({
      intent: 'create',
      target: 'todos',
      title: undefined,
      slots: { title: '' },
    })

    const result = reviewWorkspaceRunPlan({
      runId: 'run_1',
      draftTasks: [draftTask],
      plan: createPlan({
        steps: [
          {
            id: 'step_1',
            action: 'query_assets',
            target: 'notes',
            title: '查找历史会议纪要',
            risk: 'low',
            requiresUserApproval: false,
          },
        ],
      }),
      understandingPreview: createUnderstandingPreview({ draftTasks: [draftTask] }),
      updatedAt,
    })

    expect(result).toEqual({
      status: 'reject',
      reason: 'invalid_plan',
    })
  })

  it('requests slot clarification for update steps without candidates', () => {
    const draftTask = createDraftTask({
      intent: 'update',
      target: 'todos',
      title: '把这个待办处理一下',
      confidence: 0.82,
    })

    const result = reviewWorkspaceRunPlan({
      runId: 'run_1',
      draftTasks: [draftTask],
      plan: createPlan({
        steps: [
          {
            id: 'step_1',
            action: 'update_todo',
            target: 'todos',
            title: '把这个待办处理一下',
            risk: 'high',
            requiresUserApproval: true,
            candidates: [],
          },
        ],
      }),
      understandingPreview: createUnderstandingPreview({ draftTasks: [draftTask] }),
      updatedAt,
    })

    const awaitUser = expectAwaitUser(result)
    expect(awaitUser.reason).toBe('clarify_slots')
    expect(awaitUser.snapshot.interaction).toMatchObject({
      type: 'clarify_slots',
      actions: ['submit', 'cancel'],
    })
  })

  it('awaits user clarification when confidence is below threshold', () => {
    const draftTask = createDraftTask({ confidence: 0.77 })

    const result = reviewWorkspaceRunPlan({
      runId: 'run_1',
      draftTasks: [draftTask],
      plan: createPlan(),
      understandingPreview: createUnderstandingPreview({ draftTasks: [draftTask] }),
      updatedAt,
    })

    expect(result.status).toBe('await_user')
    expect(result.reason).toBe('clarify_slots')
  })

  it('still auto-executes a single clear task after draft confirmation', () => {
    const draftTask = createDraftTask({
      title: '给客户发报价',
      confidence: 0.92,
      ambiguities: [],
      corrections: [],
      slots: { title: '给客户发报价' },
    })

    const result = reviewWorkspaceRunPlan({
      runId: 'run_1',
      draftTasks: [draftTask],
      plan: createPlan({
        steps: [
          {
            id: 'step_1',
            action: 'create_todo',
            target: 'todos',
            title: '给客户发报价',
            risk: 'low',
            requiresUserApproval: false,
          },
        ],
      }),
      understandingPreview: createUnderstandingPreview({ draftTasks: [draftTask] }),
      updatedAt,
      draftTasksConfirmed: true,
    })

    expect(result).toEqual({
      status: 'auto_execute',
      reason: 'single_low_risk_clear_task',
      snapshot: null,
    })
  })

  it('awaits user clarification when ambiguities exist', () => {
    const draftTask = createDraftTask({ ambiguities: ['due_at'] })

    const result = reviewWorkspaceRunPlan({
      runId: 'run_1',
      draftTasks: [draftTask],
      plan: createPlan(),
      understandingPreview: createUnderstandingPreview({ draftTasks: [draftTask] }),
      updatedAt,
    })

    expect(result.status).toBe('await_user')
    expect(result.reason).toBe('clarify_slots')
  })

  it('requests plan confirmation when corrections exist', () => {
    const draftTask = createDraftTask({ corrections: ['prcing -> pricing'] })

    const result = reviewWorkspaceRunPlan({
      runId: 'run_1',
      draftTasks: [draftTask],
      plan: createPlan(),
      understandingPreview: createUnderstandingPreview({
        draftTasks: [draftTask],
        corrections: ['prcing -> pricing'],
      }),
      updatedAt,
    })

    const awaitUser = expectAwaitUser(result)
    expect(awaitUser.reason).toBe('confirm_plan')
    expect(awaitUser.snapshot.interaction).toMatchObject({
      type: 'confirm_plan',
      actions: ['confirm', 'edit', 'cancel'],
    })
    expect(awaitUser.snapshot.correctionNotes).toEqual(['prcing -> pricing'])
  })

  it('requests plan confirmation when only understandingPreview corrections exist', () => {
    const result = reviewWorkspaceRunPlan({
      runId: 'run_1',
      draftTasks: [createDraftTask()],
      plan: createPlan(),
      understandingPreview: createUnderstandingPreview({
        corrections: ['prcing -> pricing'],
      }),
      updatedAt,
    })

    expect(result.status).toBe('await_user')
    expect(result.reason).toBe('confirm_plan')
  })

  it('awaits user when a write step is missing title', () => {
    const draftTask = createDraftTask({ title: undefined, slots: { title: '' } })

    const result = reviewWorkspaceRunPlan({
      runId: 'run_1',
      draftTasks: [draftTask],
      plan: createPlan(),
      understandingPreview: createUnderstandingPreview({ draftTasks: [draftTask] }),
      updatedAt,
    })

    expect(result.status).toBe('await_user')
    expect(result.reason).toBe('clarify_slots')
  })

  it('returns all missing bookmark required fields in one clarification', () => {
    const draftTask = createDraftTask({
      target: 'bookmarks',
      title: undefined,
      slots: {
        title: '',
      },
    })

    const result = reviewWorkspaceRunPlan({
      runId: 'run_1',
      draftTasks: [draftTask],
      plan: createPlan({
        steps: [
          {
            id: 'step_1',
            action: 'create_bookmark',
            target: 'bookmarks',
            title: '',
            risk: 'low',
            requiresUserApproval: false,
          },
        ],
      }),
      understandingPreview: createUnderstandingPreview({ draftTasks: [draftTask] }),
      updatedAt,
    })

    const awaitUser = expectAwaitUser(result)
    expect(awaitUser.reason).toBe('clarify_slots')
    expect(awaitUser.snapshot.interaction).toMatchObject({
      type: 'clarify_slots',
      fields: [
        expect.objectContaining({ key: 'url' }),
        expect.objectContaining({ key: 'title' }),
      ],
    })
  })

  it('returns bookmark title field when title key is completely missing', () => {
    const draftTask = createDraftTask({
      target: 'bookmarks',
      title: undefined,
      slots: {},
    })

    const result = reviewWorkspaceRunPlan({
      runId: 'run_1',
      draftTasks: [draftTask],
      plan: createPlan({
        steps: [
          {
            id: 'step_1',
            action: 'create_bookmark',
            target: 'bookmarks',
            title: '',
            risk: 'low',
            requiresUserApproval: false,
          },
        ],
      }),
      understandingPreview: createUnderstandingPreview({ draftTasks: [draftTask] }),
      updatedAt,
    })

    const awaitUser = expectAwaitUser(result)
    expect(awaitUser.reason).toBe('clarify_slots')
    expect(awaitUser.snapshot.interaction).toMatchObject({
      type: 'clarify_slots',
      fields: [
        expect.objectContaining({ key: 'url' }),
        expect.objectContaining({ key: 'title' }),
      ],
    })
  })

  it('auto-executes only low-risk steps that do not require approval', () => {
    const result = reviewWorkspaceRunPlan({
      runId: 'run_1',
      draftTasks: [
        createDraftTask({
          intent: 'query',
          target: 'notes',
          title: '查找本周会议纪要',
        }),
      ],
      plan: createPlan({
        steps: [
          {
            id: 'step_1',
            action: 'query_assets',
            target: 'notes',
            title: '查找本周会议纪要',
            risk: 'low',
            requiresUserApproval: false,
          },
        ],
      }),
      understandingPreview: createUnderstandingPreview(),
      updatedAt,
    })

    expect(result).toEqual({
      status: 'auto_execute',
      reason: 'single_low_risk_clear_task',
      snapshot: null,
    })
  })

  it('does not auto-execute when a single draft task expands to multiple plan steps', () => {
    const result = reviewWorkspaceRunPlan({
      runId: 'run_1',
      draftTasks: [
        createDraftTask({
          intent: 'query',
          target: 'notes',
          title: '查找本周会议纪要',
        }),
      ],
      plan: createPlan({
        summary: '准备执行 2 个任务。',
        steps: [
          {
            id: 'step_1',
            action: 'query_assets',
            target: 'notes',
            title: '查找本周会议纪要',
            risk: 'low',
            requiresUserApproval: false,
          },
          {
            id: 'step_2',
            action: 'query_assets',
            target: 'notes',
            title: '查找本周会议纪要',
            risk: 'low',
            requiresUserApproval: false,
          },
        ],
      }),
      understandingPreview: createUnderstandingPreview(),
      updatedAt,
    })

    expect(result).toEqual({
      status: 'reject',
      reason: 'invalid_plan',
    })
  })

  it('rejects when single-task multi-step plan contains an inconsistent extra step', () => {
    const result = reviewWorkspaceRunPlan({
      runId: 'run_1',
      draftTasks: [
        createDraftTask({
          intent: 'query',
          target: 'notes',
          title: '查找本周会议纪要',
        }),
      ],
      plan: createPlan({
        summary: '准备执行 2 个任务。',
        steps: [
          {
            id: 'step_1',
            action: 'query_assets',
            target: 'notes',
            title: '查找本周会议纪要',
            risk: 'low',
            requiresUserApproval: false,
          },
          {
            id: 'step_2',
            action: 'create_todo',
            target: 'todos',
            title: '给客户发报价',
            risk: 'low',
            requiresUserApproval: false,
          },
        ],
      }),
      understandingPreview: createUnderstandingPreview(),
      updatedAt,
    })

    expect(result).toEqual({
      status: 'reject',
      reason: 'invalid_plan',
    })
  })

  it('does not auto-execute when plan step intent or title is inconsistent with the draft task', () => {
    const result = reviewWorkspaceRunPlan({
      runId: 'run_1',
      draftTasks: [createDraftTask({ intent: 'create', target: 'todos', title: '给客户发报价' })],
      plan: createPlan({
        steps: [
          {
            id: 'step_1',
            action: 'query_assets',
            target: 'notes',
            title: '查找历史会议纪要',
            risk: 'low',
            requiresUserApproval: false,
          },
        ],
      }),
      understandingPreview: createUnderstandingPreview(),
      updatedAt,
    })

    expect(result).toEqual({
      status: 'reject',
      reason: 'invalid_plan',
    })
  })

  it('does not reject when title is normalized but action and target stay consistent', () => {
    const result = reviewWorkspaceRunPlan({
      runId: 'run_1',
      draftTasks: [
        createDraftTask({
          intent: 'create',
          target: 'bookmarks',
          title: '存一下这个链接',
          slots: {
            title: '存一下这个链接',
            url: 'https://example.com',
          },
        }),
      ],
      plan: createPlan({
        steps: [
          {
            id: 'step_1',
            action: 'create_bookmark',
            target: 'bookmarks',
            title: '保存官网定价页',
            risk: 'low',
            requiresUserApproval: false,
          },
        ],
      }),
      understandingPreview: createUnderstandingPreview(),
      updatedAt,
    })

    expect(result.status).toBe('await_user')
    expect(result.reason).toBe('confirm_plan')
  })

  it('does not auto-execute when original task target is mixed even if the step is a low-risk bookmark create', () => {
    const result = reviewWorkspaceRunPlan({
      runId: 'run_1',
      draftTasks: [
        createDraftTask({
          intent: 'create',
          target: 'mixed',
          title: '存一下这个链接',
          slots: {
            url: 'https://example.com',
          },
        }),
      ],
      plan: createPlan({
        steps: [
          {
            id: 'step_1',
            action: 'create_bookmark',
            target: 'bookmarks',
            title: '保存官网定价页',
            risk: 'low',
            requiresUserApproval: false,
          },
        ],
      }),
      understandingPreview: createUnderstandingPreview(),
      updatedAt,
    })

    expect(result.status).toBe('await_user')
    expect(result.reason).toBe('confirm_plan')
  })

  it('supports mixed target in local review step contract', () => {
    const result = reviewWorkspaceRunPlan({
      runId: 'run_1',
      draftTasks: [
        createDraftTask({
          intent: 'query',
          target: 'mixed',
          title: '查一下最近内容',
        }),
      ],
      plan: createPlan({
        steps: [
          {
            id: 'step_1',
            action: 'query_assets',
            target: 'mixed',
            title: '查一下最近内容',
            risk: 'medium',
            requiresUserApproval: true,
          },
        ],
      }),
      understandingPreview: createUnderstandingPreview(),
      updatedAt,
    })

    expect(result.status).toBe('await_user')
  })

  it('rejects empty draftTasks safely', () => {
    const result = reviewWorkspaceRunPlan({
      runId: 'run_1',
      draftTasks: [],
      plan: createPlan(),
      understandingPreview: null,
      updatedAt,
    })

    expect(result).toEqual({
      status: 'reject',
      reason: 'invalid_plan',
    })
  })

  it('rejects empty plan steps safely', () => {
    const result = reviewWorkspaceRunPlan({
      runId: 'run_1',
      draftTasks: [createDraftTask()],
      plan: createPlan({ steps: [] }),
      understandingPreview: createUnderstandingPreview(),
      updatedAt,
    })

    expect(result).toEqual({
      status: 'reject',
      reason: 'invalid_plan',
    })
  })

  it('returns a serializable pending snapshot payload for paused review recovery', () => {
    const draftTask = createDraftTask({ confidence: 0.77 })
    const understandingPreview = createUnderstandingPreview({ draftTasks: [draftTask] })

    const result = reviewWorkspaceRunPlan({
      runId: 'run_1',
      draftTasks: [draftTask],
      plan: createPlan(),
      understandingPreview,
      updatedAt,
    })

    const awaitUser = expectAwaitUser(result)
    expect(awaitUser.snapshot).toEqual({
      runId: 'run_1',
      referenceTime: updatedAt,
      phase: 'review',
      status: 'awaiting_user',
      interactionId: expect.any(String),
      interaction: expect.objectContaining({
        runId: 'run_1',
        type: 'clarify_slots',
      }),
      preview: {
        understanding: understandingPreview,
        plan: expect.any(Object),
      },
      timeline: [
        { type: 'phase_started', phase: 'review' },
        {
          type: 'awaiting_user',
          interaction: expect.objectContaining({
            runId: 'run_1',
            type: 'clarify_slots',
          }),
        },
      ],
      understandingPreview,
      correctionNotes: [],
      updatedAt,
    })
    expect(JSON.parse(JSON.stringify(awaitUser.snapshot))).toEqual(awaitUser.snapshot)
  })

  it('does not block todo creation when the only ambiguity is a vague time phrase', () => {
    const result = reviewWorkspaceRunPlan({
      runId: 'run_1',
      draftTasks: [
        createDraftTask({
          title: '尽快处理报销',
          ambiguities: ['时间表述“尽快”不明确'],
          slots: {},
        }),
      ],
      plan: createPlan({
        steps: [
          {
            action: 'create_todo',
            target: 'todos',
            title: '尽快处理报销',
            requiresUserApproval: false,
            risk: 'low',
            id: 'step_1',
          },
        ],
      }),
      understandingPreview: createUnderstandingPreview(),
      updatedAt,
    })

    expect(result).toEqual({
      status: 'auto_execute',
      reason: 'single_low_risk_clear_task',
      snapshot: null,
    })
  })
})
