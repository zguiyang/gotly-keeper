import { describe, expect, it } from 'vitest'

import type { WorkspaceReviewPendingRunSnapshot } from '@/server/modules/workspace-agent/workspace-run-review'

function createSnapshot(overrides: Partial<WorkspaceReviewPendingRunSnapshot> = {}): WorkspaceReviewPendingRunSnapshot {
  return {
    runId: 'run_1',
    phase: 'review',
    status: 'awaiting_user',
    interactionId: 'run_1_confirm_plan',
    interaction: {
      runId: 'run_1',
      id: 'run_1_confirm_plan',
      type: 'confirm_plan',
      message: '请确认执行计划。',
      actions: ['confirm', 'edit', 'cancel'] as const,
      plan: {
        summary: '准备执行 1 个任务。',
        steps: [
          {
            id: 'step_1',
            toolName: 'create_todo',
            title: '给客户发报价',
            preview: '创建待办：给客户发报价',
          },
        ],
      },
    },
    timeline: [
      { type: 'phase_started', phase: 'review' },
      {
        type: 'awaiting_user',
        interaction: {
          runId: 'run_1',
          id: 'run_1_confirm_plan',
          type: 'confirm_plan',
          message: '请确认执行计划。',
          actions: ['confirm', 'edit', 'cancel'] as const,
          plan: {
            summary: '准备执行 1 个任务。',
            steps: [
              {
                id: 'step_1',
                toolName: 'create_todo',
                title: '给客户发报价',
                preview: '创建待办：给客户发报价',
              },
            ],
          },
        },
      },
    ],
    preview: {
      plan: {
        summary: '准备执行 1 个任务。',
        steps: [
          {
            id: 'step_1',
            toolName: 'create_todo',
            title: '给客户发报价',
            preview: '创建待办：给客户发报价',
          },
        ],
      },
    },
    understandingPreview: null,
    correctionNotes: [],
    updatedAt: '2026-04-27T12:00:00.000Z',
    ...overrides,
  }
}

describe('workspace-run-store.drizzle', () => {
  describe('snapshot shape validation', () => {
    it('accepts valid WorkspaceReviewPendingRunSnapshot', () => {
      const snapshot = createSnapshot()
      expect(snapshot.runId).toBe('run_1')
      expect(snapshot.phase).toBe('review')
      expect(snapshot.status).toBe('awaiting_user')
      expect(snapshot.interaction.type).toBe('confirm_plan')
    })

    it('accepts snapshot with understand preview', () => {
      const snapshot = createSnapshot({
        understandingPreview: {
          rawInput: '给客户发报价',
          normalizedInput: '给客户发报价',
          draftTasks: [
            {
              id: 'draft_1',
              intent: 'create',
              target: 'todos',
              title: '给客户发报价',
              confidence: 0.92,
              ambiguities: [],
              corrections: [],
              slots: { title: '给客户发报价' },
            },
          ],
          corrections: [],
        },
      })
      expect(snapshot.understandingPreview).not.toBeNull()
    })

    it('accepts snapshot with correction notes', () => {
      const snapshot = createSnapshot({
        correctionNotes: ['注意：这是一个测试'],
      })
      expect(snapshot.correctionNotes).toContain('注意：这是一个测试')
    })

    it('accepts snapshot with candidate selection interaction', () => {
      const snapshot = createSnapshot({
        interactionId: 'run_1_select_candidate',
        interaction: {
          runId: 'run_1',
          id: 'run_1_select_candidate',
          type: 'select_candidate',
          target: 'todo',
          message: '找到多个可更新待办，请选择。',
          actions: ['select', 'skip', 'cancel'] as const,
          candidates: [
            { id: 'todo_1', label: '给客户发报价' },
            { id: 'todo_2', label: '跟进报价' },
          ],
        },
      })
      expect(snapshot.interaction.type).toBe('select_candidate')
    })

    it('accepts snapshot with clarify_slots interaction', () => {
      const snapshot = createSnapshot({
        interactionId: 'run_1_clarify_slots',
        interaction: {
          runId: 'run_1',
          id: 'run_1_clarify_slots',
          type: 'clarify_slots',
          message: '这条任务的意图还不够确定，请补充说明。',
          actions: ['submit', 'cancel'] as const,
          fields: [
            { key: 'title', label: '标题', required: true, placeholder: '请输入标题' },
          ],
        },
      })
      expect(snapshot.interaction.type).toBe('clarify_slots')
    })

    it('accepts snapshot with edit_draft_tasks interaction', () => {
      const snapshot = createSnapshot({
        interactionId: 'run_1_edit_draft_tasks',
        interaction: {
          runId: 'run_1',
          id: 'run_1_edit_draft_tasks',
          type: 'edit_draft_tasks',
          message: '这次请求包含多个草稿任务，请先确认或编辑。',
          actions: ['save', 'cancel'] as const,
          tasks: [
            {
              id: 'draft_1',
              intent: 'create',
              target: 'todos',
              title: '给客户发报价',
              confidence: 0.92,
              ambiguities: [],
              corrections: [],
              slots: { title: '给客户发报价' },
            },
          ],
        },
      })
      expect(snapshot.interaction.type).toBe('edit_draft_tasks')
    })
  })

  describe('status transitions', () => {
    it('defines valid status values', () => {
      const validStatuses = ['awaiting_user', 'running', 'completed', 'failed'] as const
      expect(validStatuses).toContain('awaiting_user')
      expect(validStatuses).toContain('running')
      expect(validStatuses).toContain('completed')
      expect(validStatuses).toContain('failed')
    })
  })
})
