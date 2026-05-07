import { describe, expect, it } from 'vitest'

import {
  workspaceInteractionResponseSchema,
  workspaceInteractionSchema,
  workspaceRunRequestSchema,
} from '@/shared/workspace/workspace-run-protocol'

describe('workspace run protocol', () => {
  it('accepts a new input run request', () => {
    expect(
      workspaceRunRequestSchema.parse({
        kind: 'input',
        text: '记个待办：明天下午发报价',
      })
    ).toEqual({
      kind: 'input',
      text: '记个待办：明天下午发报价',
    })
  })

  it('accepts confirm_plan with confirm/cancel actions only', () => {
    expect(
      workspaceInteractionSchema.parse({
        runId: 'run_123',
        id: 'interaction_confirm',
        type: 'confirm_plan',
        message: '请确认执行计划。',
        actions: ['confirm', 'cancel'],
        plan: {
          summary: '准备执行 2 个任务。',
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
      actions: ['confirm', 'cancel'],
    })

    expect(() =>
      workspaceInteractionSchema.parse({
        runId: 'run_123',
        id: 'interaction_confirm',
        type: 'confirm_plan',
        message: '请确认执行计划。',
        actions: ['confirm', 'edit', 'cancel'],
        plan: { summary: 'x', steps: [] },
      })
    ).toThrow()
  })

  it('accepts candidate selection and duplicate confirmation payloads', () => {
    expect(
      workspaceInteractionSchema.parse({
        runId: 'run_123',
        id: 'interaction_select',
        type: 'select_candidate',
        target: 'todo',
        message: '请选择待办',
        actions: ['select', 'skip', 'cancel'],
        candidates: [{ id: 'todo_1', label: '发报价' }],
      })
    ).toMatchObject({ type: 'select_candidate' })

    expect(
      workspaceInteractionSchema.parse({
        runId: 'run_123',
        id: 'interaction_duplicate',
        type: 'confirm_duplicate',
        source: 'bookmark_precheck',
        target: 'bookmark',
        message: '发现可能重复的书签。',
        actions: ['create', 'skip', 'cancel'],
        current: {
          stepId: 'step_1',
          title: 'OpenAI',
          preview: '创建书签：OpenAI',
        },
        duplicates: [{ id: 'bookmark_1', label: 'OpenAI' }],
      })
    ).toMatchObject({ type: 'confirm_duplicate' })
  })

  it('binds interaction responses to the narrowed MVP payloads', () => {
    expect(
      workspaceInteractionResponseSchema.parse({
        type: 'confirm_plan',
        action: 'confirm',
      })
    ).toEqual({
      type: 'confirm_plan',
      action: 'confirm',
    })

    expect(
      workspaceInteractionResponseSchema.parse({
        type: 'clarify_slots',
        action: 'submit',
        values: {
          details: '普通用户希望一句话直接保存',
        },
      })
    ).toMatchObject({
      type: 'clarify_slots',
      action: 'submit',
    })

    expect(() =>
      workspaceInteractionResponseSchema.parse({
        type: 'confirm_plan',
        action: 'edit',
      })
    ).toThrow()
  })
})
