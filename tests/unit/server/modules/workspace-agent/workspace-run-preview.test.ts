import { describe, expect, it } from 'vitest'

import { buildWorkspaceRunPreview } from '@/server/modules/workspace-agent/workspace-run-preview'

import type { WorkspaceRunPlannerResult } from '@/server/modules/workspace-agent/workspace-run-planner'

function createPlannerResult(overrides: Partial<WorkspaceRunPlannerResult> = {}): WorkspaceRunPlannerResult {
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

const mockUnderstandingPreview = {
  rawInput: '给客户发报价',
  normalizedInput: '给客户发报价',
  draftTasks: [
    {
      id: 'draft_1',
      intent: 'create' as const,
      target: 'todos' as const,
      title: '给客户发报价',
      confidence: 0.92,
      ambiguities: [] as string[],
      corrections: [] as string[],
      slots: { title: '给客户发报价' },
    },
  ],
  corrections: [] as string[],
}

describe('workspace-run-preview', () => {
  describe('buildWorkspaceRunPreview', () => {
    it('generates preview with plan steps', () => {
      const plannerResult = createPlannerResult()

      const result = buildWorkspaceRunPreview({
        runId: 'run_1',
        understandingPreview: null,
        plannerResult,
      })

      expect(result.plan).toEqual({
        summary: '准备执行 1 个任务。',
        steps: [
          {
            id: 'step_1',
            toolName: 'create_todo',
            title: '创建待办',
            preview: '创建待办：给客户发报价',
          },
        ],
      })
      expect(result.understanding).toBeUndefined()
    })

    it('includes understanding preview when provided', () => {
      const plannerResult = createPlannerResult()

      const result = buildWorkspaceRunPreview({
        runId: 'run_1',
        understandingPreview: mockUnderstandingPreview,
        plannerResult,
      })

      expect(result.understanding).toEqual(mockUnderstandingPreview)
      expect(result.plan).toBeDefined()
    })

    it('maps all action types to correct tool names', () => {
      const plannerResult = createPlannerResult({
        summary: '准备执行 6 个任务。',
        steps: [
          {
            id: 'step_1',
            action: 'create_note',
            target: 'notes',
            title: '记录会议',
            risk: 'low',
            requiresUserApproval: false,
          },
          {
            id: 'step_2',
            action: 'create_todo',
            target: 'todos',
            title: '创建待办',
            risk: 'low',
            requiresUserApproval: false,
          },
          {
            id: 'step_3',
            action: 'create_bookmark',
            target: 'bookmarks',
            title: '保存链接',
            risk: 'low',
            requiresUserApproval: false,
          },
          {
            id: 'step_4',
            action: 'query_assets',
            target: 'mixed',
            title: '查询资产',
            risk: 'medium',
            requiresUserApproval: true,
          },
          {
            id: 'step_5',
            action: 'summarize_assets',
            target: 'notes',
            title: '总结笔记',
            risk: 'medium',
            requiresUserApproval: true,
          },
          {
            id: 'step_6',
            action: 'update_todo',
            target: 'todos',
            title: '更新待办',
            risk: 'high',
            requiresUserApproval: true,
          },
        ],
      })

      const result = buildWorkspaceRunPreview({
        runId: 'run_1',
        understandingPreview: null,
        plannerResult,
      })

      expect(result.plan?.steps).toHaveLength(6)
      expect(result.plan?.steps[0]).toMatchObject({
        toolName: 'create_note',
        title: '创建笔记',
      })
      expect(result.plan?.steps[1]).toMatchObject({
        toolName: 'create_todo',
        title: '创建待办',
      })
      expect(result.plan?.steps[2]).toMatchObject({
        toolName: 'create_bookmark',
        title: '创建书签',
      })
      expect(result.plan?.steps[3]).toMatchObject({
        toolName: 'query_assets',
        title: '查询资产',
      })
      expect(result.plan?.steps[4]).toMatchObject({
        toolName: 'summarize_assets',
        title: '总结资产',
      })
      expect(result.plan?.steps[5]).toMatchObject({
        toolName: 'update_todo',
        title: '更新待办',
      })
    })

    it('handles steps without title', () => {
      const plannerResult = createPlannerResult({
        steps: [
          {
            id: 'step_1',
            action: 'query_assets',
            target: 'mixed',
            title: '',
            risk: 'medium',
            requiresUserApproval: true,
          },
        ],
      })

      const result = buildWorkspaceRunPreview({
        runId: 'run_1',
        understandingPreview: null,
        plannerResult,
      })

      expect(result.plan?.steps[0].preview).toBe('查询资产：')
    })

    it('preserves step ids in preview', () => {
      const plannerResult = createPlannerResult({
        steps: [
          { id: 'step_1', action: 'create_todo', target: 'todos', risk: 'low', requiresUserApproval: false },
          { id: 'step_2', action: 'create_note', target: 'notes', risk: 'low', requiresUserApproval: false },
        ],
      })

      const result = buildWorkspaceRunPreview({
        runId: 'run_1',
        understandingPreview: null,
        plannerResult,
      })

      expect(result.plan?.steps[0].id).toBe('step_1')
      expect(result.plan?.steps[1].id).toBe('step_2')
    })
  })
})
