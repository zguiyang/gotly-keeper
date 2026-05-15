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
    captureMode: 'todo_capture',
    clarifyReason: 'none',
    confidence: 0.92,
    ambiguities: [],
    corrections: [],
    slots: { title: '给客户发报价' },
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

function toPreviewDraftTask(task: ReviewableDraftTask): DraftWorkspaceTask {
  return {
    id: task.id,
    intent: task.intent,
    target: task.target,
    title: task.title ?? '',
    cleanTitle: task.cleanTitle,
    cleanContent: task.cleanContent,
    captureMode: task.captureMode,
    clarifyReason: task.clarifyReason,
    repeatRelation: task.repeatRelation,
    targetConfidence: task.targetConfidence,
    confidence: task.confidence,
    ambiguities: task.ambiguities,
    corrections: task.corrections,
    slots: Object.fromEntries(
      Object.entries(task.slots).filter((entry): entry is [string, string] => typeof entry[1] === 'string')
    ),
  }
}

function createUnderstandingPreview(tasks: ReviewableDraftTask[]): WorkspaceUnderstandingPreview {
  return {
    rawInput: '测试输入',
    normalizedInput: '测试输入',
    draftTasks: tasks.map(toPreviewDraftTask),
    corrections: [],
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
  it('auto-executes a clear single low-risk task', () => {
    const task = createDraftTask()
    const result = reviewWorkspaceRunPlan({
      runId: 'run_1',
      draftTasks: [task],
      plan: createPlan(),
      understandingPreview: createUnderstandingPreview([task]),
      updatedAt,
    })

    expect(result).toEqual({
      status: 'auto_execute',
      reason: 'single_low_risk_clear_task',
      snapshot: null,
    })
  })

  it('asks for clarification when the target is still mixed', () => {
    const task = createDraftTask({
      target: 'mixed',
      clarifyReason: 'unknown_target',
      title: '记一下：普通用户希望一句话直接保存',
    })

    const result = reviewWorkspaceRunPlan({
      runId: 'run_1',
      draftTasks: [task],
      plan: createPlan({
        steps: [
          {
            id: 'step_1',
            action: 'query_assets',
            target: 'mixed',
            title: task.title,
            risk: 'medium',
            requiresUserApproval: true,
          },
        ],
      }),
      understandingPreview: createUnderstandingPreview([task]),
      updatedAt,
    })

    const awaitUser = expectAwaitUser(result)
    expect(awaitUser.reason).toBe('clarify_slots')
    expect(awaitUser.snapshot.interaction).toMatchObject({
      type: 'clarify_slots',
      fields: [
        expect.objectContaining({ key: 'target' }),
        expect.objectContaining({ key: 'details' }),
      ],
    })
  })

  it('uses read-specific clarification for mixed query intents instead of create fields', () => {
    const task = createDraftTask({
      intent: 'query',
      target: 'mixed',
      title: '帮我找一下刚刚记的 RQA0507R7 内容',
      captureMode: 'none',
      clarifyReason: 'none',
      confidence: 0.88,
      slots: {},
    })

    const result = reviewWorkspaceRunPlan({
      runId: 'run_1',
      draftTasks: [task],
      plan: createPlan({
        steps: [
          {
            id: 'step_1',
            action: 'query_assets',
            target: 'mixed',
            title: task.title,
            risk: 'low',
            requiresUserApproval: false,
          },
        ],
      }),
      understandingPreview: createUnderstandingPreview([task]),
      updatedAt,
    })

    const awaitUser = expectAwaitUser(result)
    expect(awaitUser.reason).toBe('clarify_slots')
    expect(awaitUser.snapshot.interaction).toMatchObject({
      type: 'clarify_slots',
      fields: [expect.objectContaining({ key: 'query' })],
    })
    expect(awaitUser.snapshot.interaction).not.toMatchObject({
      fields: [expect.objectContaining({ key: 'target' })],
    })
    expect(awaitUser.snapshot.interaction.message).toBe('我知道你想查找内容，但还缺更具体的关键词。')
  })

  it('does not re-clarify mixed query intents once a concrete query is present', () => {
    const task = createDraftTask({
      intent: 'query',
      target: 'mixed',
      title: '帮我找一下 RQA0507R5A',
      captureMode: 'none',
      clarifyReason: 'none',
      confidence: 0.88,
      ambiguities: [],
      slots: {
        query: 'RQA0507R5A',
      },
    })

    const result = reviewWorkspaceRunPlan({
      runId: 'run_1',
      draftTasks: [task],
      plan: createPlan({
        steps: [
          {
            id: 'step_1',
            action: 'query_assets',
            target: 'mixed',
            title: task.title,
            risk: 'low',
            requiresUserApproval: false,
          },
        ],
      }),
      understandingPreview: createUnderstandingPreview([task]),
      updatedAt,
    })

    expect(result).toEqual({
      status: 'auto_execute',
      reason: 'single_low_risk_clear_task',
      snapshot: null,
    })
  })

  it('treats mixed create tasks routed to a create step as clarifiable instead of invalid_plan', () => {
    const task = createDraftTask({
      target: 'mixed',
      clarifyReason: 'unknown_target',
      title: '下周那个你帮我整理一下 RQA0507R7G',
      captureMode: 'none',
      confidence: 0.65,
      slots: {},
    })

    const result = reviewWorkspaceRunPlan({
      runId: 'run_1',
      draftTasks: [task],
      plan: createPlan({
        steps: [
          {
            id: 'step_1',
            action: 'create_note',
            target: 'notes',
            title: task.title,
            risk: 'low',
            requiresUserApproval: false,
          },
        ],
      }),
      understandingPreview: createUnderstandingPreview([task]),
      updatedAt,
    })

    const awaitUser = expectAwaitUser(result)
    expect(awaitUser.reason).toBe('clarify_slots')
    expect(awaitUser.snapshot.interaction).toMatchObject({
      type: 'clarify_slots',
    })
  })

  it('uses candidate selection when update_todo has multiple matches', () => {
    const task = createDraftTask({
      intent: 'update',
      title: '把给客户发报价标记完成',
    })

    const result = reviewWorkspaceRunPlan({
      runId: 'run_1',
      draftTasks: [task],
      plan: createPlan({
        steps: [
          {
            id: 'step_1',
            action: 'update_todo',
            target: 'todos',
            title: task.title,
            risk: 'high',
            requiresUserApproval: true,
            candidates: [
              { id: 'todo_1', type: 'todo', title: '给客户发报价', confidence: 0.94, matchReason: '标题完全匹配' },
              { id: 'todo_2', type: 'todo', title: '跟进报价', confidence: 0.83, matchReason: '关键词匹配' },
            ],
          },
        ],
      }),
      understandingPreview: createUnderstandingPreview([task]),
      updatedAt,
    })

    const awaitUser = expectAwaitUser(result)
    expect(awaitUser.reason).toBe('select_candidate')
  })

  it('asks for keyword clarification when update_todo has no candidate', () => {
    const task = createDraftTask({
      intent: 'update',
      title: '把那个待办处理一下',
    })

    const result = reviewWorkspaceRunPlan({
      runId: 'run_1',
      draftTasks: [task],
      plan: createPlan({
        steps: [
          {
            id: 'step_1',
            action: 'update_todo',
            target: 'todos',
            title: task.title,
            risk: 'high',
            requiresUserApproval: true,
            candidates: [],
          },
        ],
      }),
      understandingPreview: createUnderstandingPreview([task]),
      updatedAt,
    })

    const awaitUser = expectAwaitUser(result)
    expect(awaitUser.reason).toBe('clarify_slots')
    expect(awaitUser.snapshot.interaction).toMatchObject({
      type: 'clarify_slots',
      fields: [expect.objectContaining({ key: 'query' })],
    })
  })

  it('auto-executes update_todo when exactly one high-confidence candidate is found', () => {
    const task = createDraftTask({
      intent: 'update',
      title: '把 RQA0507R7A 那个待办标记为已完成',
      captureMode: 'none',
      slots: {
        query: 'RQA0507R7A',
        status: 'done',
      },
    })

    const result = reviewWorkspaceRunPlan({
      runId: 'run_1',
      draftTasks: [task],
      plan: createPlan({
        steps: [
          {
            id: 'step_1',
            action: 'update_todo',
            target: 'todos',
            title: task.title,
            risk: 'high',
            requiresUserApproval: true,
            candidates: [
              { id: 'todo_1', type: 'todo', title: '整理第7轮真实用户验收结论 RQA0507R7A', confidence: 0.96, matchReason: '唯一高置信候选' },
            ],
          },
        ],
      }),
      understandingPreview: createUnderstandingPreview([task]),
      updatedAt,
    })

    expect(result).toEqual({
      status: 'auto_execute',
      reason: 'single_low_risk_clear_task',
      snapshot: null,
    })
  })

  it('confirms a multi-task split instead of entering heavy draft editing', () => {
    const tasks = [
      createDraftTask({ id: 'draft_1', title: '和设计过一下第 6 轮结果' }),
      createDraftTask({ id: 'draft_2', target: 'notes', title: '普通用户会连续补充第二句话', captureMode: 'note_capture' }),
    ]

    const result = reviewWorkspaceRunPlan({
      runId: 'run_1',
      draftTasks: tasks,
      plan: {
        summary: '准备执行 2 个任务。',
        steps: [
          {
            id: 'step_1',
            action: 'create_todo',
            target: 'todos',
            title: tasks[0].title,
            risk: 'low',
            requiresUserApproval: false,
          },
          {
            id: 'step_2',
            action: 'create_note',
            target: 'notes',
            title: tasks[1].title,
            risk: 'low',
            requiresUserApproval: false,
          },
        ],
      },
      understandingPreview: createUnderstandingPreview(tasks),
      updatedAt,
    })

    const awaitUser = expectAwaitUser(result)
    expect(awaitUser.reason).toBe('confirm_plan')
    expect(awaitUser.snapshot.interaction).toMatchObject({
      type: 'confirm_plan',
      actions: ['confirm', 'cancel'],
    })
  })

  it('confirms duplicate bookmark creation before execution', () => {
    const task = createDraftTask({
      target: 'bookmarks',
      title: 'OpenAI',
      captureMode: 'bookmark_capture',
      slots: {
        url: 'https://openai.com',
      },
    })

    const result = reviewWorkspaceRunPlan({
      runId: 'run_1',
      draftTasks: [task],
      plan: createPlan({
        steps: [
          {
            id: 'step_1',
            action: 'create_bookmark',
            target: 'bookmarks',
            title: 'OpenAI',
            risk: 'low',
            requiresUserApproval: false,
          },
        ],
      }),
      understandingPreview: createUnderstandingPreview([task]),
      updatedAt,
      duplicateCandidates: [
        {
          stepId: 'step_1',
          target: 'bookmark',
          source: 'precheck',
          duplicates: [{ id: 'bookmark_1', label: 'OpenAI', type: 'bookmark' }],
        },
      ],
    })

    const awaitUser = expectAwaitUser(result)
    expect(awaitUser.reason).toBe('confirm_duplicate')
  })
})
