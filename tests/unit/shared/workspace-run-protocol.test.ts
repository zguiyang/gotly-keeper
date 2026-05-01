import { describe, expect, expectTypeOf, it } from 'vitest'

import {
  workspaceInteractionSchema,
  workspaceInteractionResponseSchema,
  workspacePendingRunSnapshotSchema,
  workspaceRunRequestSchema,
  workspaceRunStreamEventSchema,
} from '@/shared/workspace/workspace-run-protocol'

import type {
  WorkspacePendingRunSnapshot,
  WorkspaceRunResult,
  WorkspaceRunStreamEvent as WorkspaceRunEvent,
} from '@/shared/workspace/workspace-run-protocol'

describe('workspace run protocol', () => {
  it('accepts a new input run request', () => {
    expect(
      workspaceRunRequestSchema.parse({
        kind: 'input',
        text: '记个待办，明天下午发报价',
      })
    ).toEqual({
      kind: 'input',
      text: '记个待办，明天下午发报价',
    })
  })

  it('accepts a resume response for selecting a candidate', () => {
    expect(
      workspaceInteractionResponseSchema.parse({
        type: 'select_candidate',
        action: 'select',
        candidateId: 'todo_123',
      })
    ).toEqual({
      type: 'select_candidate',
      action: 'select',
      candidateId: 'todo_123',
    })
  })

  it('accepts duplicate confirmation interactions and responses', () => {
    expect(
      workspaceInteractionSchema.parse({
        runId: 'run_123',
        id: 'interaction_duplicate',
        type: 'confirm_duplicate',
        target: 'todo',
        message: '发现一条可能重复的待办。',
        actions: ['create', 'skip', 'cancel'],
        current: {
          stepId: 'step_1',
          title: '给客户发报价',
          preview: '创建待办：给客户发报价',
        },
        duplicates: [
          {
            id: 'todo_123',
            label: '给客户发报价',
            reason: '标题和时间完全一致',
          },
        ],
      })
    ).toMatchObject({
      type: 'confirm_duplicate',
      target: 'todo',
      actions: ['create', 'skip', 'cancel'],
    })

    expect(
      workspaceInteractionResponseSchema.parse({
        type: 'confirm_duplicate',
        action: 'skip',
      })
    ).toEqual({
      type: 'confirm_duplicate',
      action: 'skip',
    })
  })

  it('binds interaction response actions to their required payloads', () => {
    expect(
      workspaceInteractionResponseSchema.parse({
        type: 'confirm_plan',
        action: 'edit',
        editedPlan: {
          summary: '改成先确认客户名单。',
          steps: [
            {
              id: 'step_1',
              toolName: 'update_todo',
              title: '更新待办',
              preview: '更新待办：先确认客户名单',
            },
          ],
        },
      })
    ).toMatchObject({
      type: 'confirm_plan',
      action: 'edit',
    })

    expect(() =>
      workspaceInteractionResponseSchema.parse({
        type: 'select_candidate',
        action: 'select',
      })
    ).toThrow()

    expect(() =>
      workspaceInteractionResponseSchema.parse({
        type: 'clarify_slots',
        action: 'submit',
      })
    ).toThrow()

    expect(() =>
      workspaceInteractionResponseSchema.parse({
        type: 'edit_draft_tasks',
        action: 'save',
      })
    ).toThrow()

    expect(() =>
      workspaceInteractionResponseSchema.parse({
        type: 'confirm_plan',
        action: 'edit',
      })
    ).toThrow()
  })

  it('requires actions for every interaction type', () => {
    expect(
      workspaceInteractionSchema.parse({
        runId: 'run_123',
        id: 'interaction_confirm',
        type: 'confirm_plan',
        message: '请确认执行计划。',
        actions: ['confirm', 'edit', 'cancel'],
        plan: {
          summary: '准备创建一个待办。',
          steps: [
            {
              id: 'step_1',
              toolName: 'create_todo',
              title: '创建待办',
              preview: '创建待办：发报价',
            },
          ],
        },
      })
    ).toMatchObject({
      type: 'confirm_plan',
      actions: ['confirm', 'edit', 'cancel'],
    })

    expect(
      workspaceInteractionSchema.parse({
        runId: 'run_123',
        id: 'interaction_clarify',
        type: 'clarify_slots',
        message: '请补充时间。',
        actions: ['submit', 'cancel'],
        fields: [
          {
            key: 'dueText',
            label: '截止时间',
          },
        ],
      })
    ).toMatchObject({
      type: 'clarify_slots',
      actions: ['submit', 'cancel'],
    })

    expect(
      workspaceInteractionSchema.parse({
        runId: 'run_123',
        id: 'interaction_edit',
        type: 'edit_draft_tasks',
        message: '请编辑草稿任务。',
        actions: ['save', 'cancel'],
        tasks: [
          {
            id: 'draft_1',
            intent: 'create',
            target: 'todos',
            title: '发报价',
            confidence: 0.8,
            ambiguities: [],
            corrections: [],
            slots: {},
          },
        ],
      })
    ).toMatchObject({
      type: 'edit_draft_tasks',
      actions: ['save', 'cancel'],
    })
  })

  it('requires target and actions for select-candidate interactions', () => {
    expect(
      workspaceInteractionSchema.parse({
        runId: 'run_123',
        id: 'interaction_select',
        type: 'select_candidate',
        target: 'todo',
        message: '请选择要更新的待办。',
        actions: ['select', 'skip', 'cancel'],
        candidates: [
          {
            id: 'todo_123',
            label: '发报价',
          },
        ],
      })
    ).toMatchObject({
      type: 'select_candidate',
      target: 'todo',
      actions: ['select', 'skip', 'cancel'],
    })

    expect(() =>
      workspaceInteractionSchema.parse({
        runId: 'run_123',
        id: 'interaction_select_missing_target',
        type: 'select_candidate',
        message: '请选择要更新的项目。',
        actions: ['select', 'skip', 'cancel'],
        candidates: [],
      })
    ).toThrow()

    expect(() =>
      workspaceInteractionSchema.parse({
        runId: 'run_123',
        id: 'interaction_select_missing_actions',
        type: 'select_candidate',
        target: 'todo',
        message: '请选择要更新的待办。',
        candidates: [],
      })
    ).toThrow()
  })

  it('accepts a resume request with an embedded interaction response', () => {
    expect(
      workspaceRunRequestSchema.parse({
        kind: 'resume',
        runId: 'run_123',
        interactionId: 'interaction_123',
        response: {
          type: 'clarify_slots',
          action: 'submit',
          values: {
            dueText: '明天下午',
          },
        },
      })
    ).toEqual({
      kind: 'resume',
      runId: 'run_123',
      interactionId: 'interaction_123',
      response: {
        type: 'clarify_slots',
        action: 'submit',
        values: {
          dueText: '明天下午',
        },
      },
    })
  })

  it('rejects unknown stream event types', () => {
    expect(() =>
      workspaceRunStreamEventSchema.parse({
        type: 'random_event',
      })
    ).toThrow()
  })

  it('accepts required observability events', () => {
    expect(
      workspaceRunStreamEventSchema.parse({
        type: 'tool_call_started',
        toolName: 'create_todo',
        preview: '创建待办：发报价',
      })
    ).toMatchObject({ type: 'tool_call_started' })

    expect(
      workspaceRunStreamEventSchema.parse({
        type: 'tool_call_completed',
        toolName: 'create_todo',
        result: { ok: true },
      })
    ).toMatchObject({ type: 'tool_call_completed' })

    expect(
      workspaceRunStreamEventSchema.parse({
        type: 'run_failed',
        error: { code: 'tool_failed', message: '工具执行失败。' },
      })
    ).toMatchObject({ type: 'run_failed' })
  })

  it('accepts awaiting-user and completed events with preview data', () => {
    const awaitingUser = workspaceRunStreamEventSchema.parse({
      type: 'awaiting_user',
      interaction: {
        runId: 'run_123',
        id: 'interaction_1',
        type: 'confirm_plan',
        message: '请确认执行计划。',
        actions: ['confirm', 'edit', 'cancel'],
        plan: {
          summary: '准备创建一个待办。',
          steps: [
            {
              id: 'step_1',
              toolName: 'create_todo',
              title: '创建待办',
              preview: '创建待办：发报价',
            },
          ],
        },
      },
    })

    expect(awaitingUser).toMatchObject({ type: 'awaiting_user' })
    if (awaitingUser.type !== 'awaiting_user') {
      throw new Error('Expected awaiting_user event')
    }

    expect(
      workspaceRunRequestSchema.parse({
        kind: 'resume',
        runId: awaitingUser.interaction.runId,
        interactionId: awaitingUser.interaction.id,
        response: {
          type: 'confirm_plan',
          action: 'confirm',
        },
      })
    ).toEqual({
      kind: 'resume',
      runId: 'run_123',
      interactionId: 'interaction_1',
      response: {
        type: 'confirm_plan',
        action: 'confirm',
      },
    })

    const runCompleted = workspaceRunStreamEventSchema.parse({
      type: 'run_completed',
      result: {
        summary: '已创建待办。',
        answer: '已保存待办：发报价。',
        preview: {
          understanding: {
            rawInput: '记个待办，明天下午发报价',
            normalizedInput: '创建待办：明天下午发报价',
            draftTasks: [
              {
                id: 'draft_1',
                intent: 'create',
                target: 'todos',
                title: '发报价',
                confidence: 0.91,
                ambiguities: [],
                corrections: [],
                slots: {
                  dueText: '明天下午',
                },
              },
            ],
            corrections: [],
          },
          plan: {
            summary: '准备创建一个待办。',
            steps: [
              {
                id: 'step_1',
                toolName: 'create_todo',
                title: '创建待办',
                preview: '创建待办：发报价',
              },
            ],
          },
        },
        data: {
          ok: true,
          action: 'create',
          target: 'todos',
          item: null,
        },
      },
    })

    expect(runCompleted).toMatchObject({ type: 'run_completed' })
  })

  it('exposes minimal pending snapshot and result types', () => {
    const pendingSnapshot: WorkspacePendingRunSnapshot = {
      runId: 'run_123',
      phase: 'review',
      status: 'awaiting_user',
      interactionId: 'interaction_123',
      interaction: {
        runId: 'run_123',
        id: 'interaction_123',
        type: 'edit_draft_tasks',
        message: '请编辑草稿任务。',
        actions: ['save', 'cancel'],
        tasks: [
          {
            id: 'draft_1',
            intent: 'create',
            target: 'todos',
            title: '发报价',
            confidence: 0.8,
            ambiguities: [],
            corrections: [],
            slots: {},
          },
        ],
      },
      preview: null,
      timeline: [],
      understandingPreview: null,
      correctionNotes: [],
      updatedAt: '2026-04-30T08:00:00.000Z',
    }
    const result: WorkspaceRunResult = {
      summary: '已完成。',
      preview: null,
      data: null,
    }

    expectTypeOf(pendingSnapshot.status).toEqualTypeOf<'awaiting_user'>()
    expectTypeOf(result.summary).toEqualTypeOf<string>()
    expectTypeOf<WorkspaceRunEvent>().toEqualTypeOf<
      (typeof workspaceRunStreamEventSchema)['_output']
    >()
  })

  it('rejects pending snapshots when interaction identity does not match the top level', () => {
    expect(() =>
      workspacePendingRunSnapshotSchema.parse({
        runId: 'run_123',
        phase: 'review',
        status: 'awaiting_user',
        interactionId: 'interaction_123',
        interaction: {
          runId: 'run_999',
          id: 'interaction_123',
          type: 'confirm_plan',
          message: '请确认执行计划。',
          actions: ['confirm', 'edit', 'cancel'],
          plan: {
            summary: '准备创建一个待办。',
            steps: [
              {
                id: 'step_1',
                toolName: 'create_todo',
                title: '创建待办',
                preview: '创建待办：发报价',
              },
            ],
          },
        },
        preview: null,
        timeline: [],
        understandingPreview: null,
        correctionNotes: [],
        updatedAt: '2026-04-30T08:00:00.000Z',
      })
    ).toThrow()

    expect(() =>
      workspacePendingRunSnapshotSchema.parse({
        runId: 'run_123',
        phase: 'review',
        status: 'awaiting_user',
        interactionId: 'interaction_123',
        interaction: {
          runId: 'run_123',
          id: 'interaction_999',
          type: 'confirm_plan',
          message: '请确认执行计划。',
          actions: ['confirm', 'edit', 'cancel'],
          plan: {
            summary: '准备创建一个待办。',
            steps: [
              {
                id: 'step_1',
                toolName: 'create_todo',
                title: '创建待办',
                preview: '创建待办：发报价',
              },
            ],
          },
        },
        preview: null,
        timeline: [],
        understandingPreview: null,
        correctionNotes: [],
        updatedAt: '2026-04-30T08:00:00.000Z',
      })
    ).toThrow()
  })
})
