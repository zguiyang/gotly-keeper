import { describe, expect, it, vi, beforeEach } from 'vitest'

import { executeWorkspaceRunSteps, isWorkspaceRunExecutorResult } from '@/server/modules/workspace-agent/workspace-run-executor'
import { executeWorkspaceTool } from '@/server/modules/workspace-agent/workspace-tools'

import type { WorkspaceToolContext } from '@/server/modules/workspace-agent/types'
import type { WorkspaceRunPlannerAction } from '@/server/modules/workspace-agent/workspace-run-planner'
import type { AssetListItem } from '@/shared/assets/assets.types'

vi.mock('@/server/modules/workspace-agent/workspace-tools', () => ({
  executeWorkspaceTool: vi.fn(),
  workspaceTools: {
    create_todo: { name: 'create_todo', execute: vi.fn() },
    create_note: { name: 'create_note', execute: vi.fn() },
    create_bookmark: { name: 'create_bookmark', execute: vi.fn() },
    update_todo: { name: 'update_todo', execute: vi.fn() },
    search_all: { name: 'search_all', execute: vi.fn() },
  },
}))

const createMockContext = (): WorkspaceToolContext => ({ userId: 'user_123' })

function createAssetItem(overrides: Partial<AssetListItem> = {}): AssetListItem {
  return {
    id: 'asset_1',
    originalText: '原始内容',
    title: '默认标题',
    excerpt: '默认摘要',
    type: 'todo',
    url: null,
    timeText: null,
    dueAt: null,
    completed: false,
    createdAt: new Date('2026-04-27T00:00:00.000Z'),
    ...overrides,
  }
}

describe('workspace-run-executor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('executeWorkspaceRunSteps', () => {
    it('maps step action to correct tool name for create_todo', async () => {
      vi.mocked(executeWorkspaceTool).mockResolvedValue({
        ok: true,
        target: 'todos',
        action: 'create',
        item: createAssetItem({ id: 'todo_1', title: 'Test todo' }),
      })

      const steps = [
        {
          id: 'step_1',
          action: 'create_todo' as const,
          target: 'todos' as const,
          title: 'Test todo',
          risk: 'low' as const,
          requiresUserApproval: false,
        },
      ]

      const result = await executeWorkspaceRunSteps(steps, createMockContext())

      expect(result.stepResults).toHaveLength(1)
      expect(result.stepResults[0].toolName).toBe('create_todo')
      expect(result.stepResults[0].result.ok).toBe(true)
    })

    it('passes through planner-provided toolInput for bookmark creation', async () => {
      vi.mocked(executeWorkspaceTool).mockResolvedValue({
        ok: true,
        target: 'bookmarks',
        action: 'create',
        item: createAssetItem({
          id: 'bookmark_1',
          type: 'link',
          title: '官网定价页',
          url: 'https://example.com/pricing',
        }),
      })

      const steps = [
        {
          id: 'step_1',
          action: 'create_bookmark' as const,
          target: 'bookmarks' as const,
          title: '官网定价页',
          risk: 'low' as const,
          requiresUserApproval: false,
          toolInput: {
            url: 'https://example.com/pricing',
            title: '官网定价页',
            summary: '重点看首屏卖点',
          },
        },
      ]

      await executeWorkspaceRunSteps(steps, createMockContext())

      expect(executeWorkspaceTool).toHaveBeenCalledWith(
        {
          toolName: 'create_bookmark',
          toolInput: {
            url: 'https://example.com/pricing',
            title: '官网定价页',
            summary: '重点看首屏卖点',
          },
        },
        { userId: 'user_123' }
      )
    })

    it('maps query_assets to search_all tool', async () => {
      vi.mocked(executeWorkspaceTool).mockResolvedValue({
        ok: true,
        target: 'mixed',
        items: [],
        total: 0,
      })

      const steps = [
        {
          id: 'step_1',
          action: 'query_assets' as const,
          target: 'mixed' as const,
          title: 'Query assets',
          risk: 'low' as const,
          requiresUserApproval: false,
        },
      ]

      const result = await executeWorkspaceRunSteps(steps, createMockContext())

      expect(result.stepResults).toHaveLength(1)
      expect(result.stepResults[0].toolName).toBe('search_all')
    })

    it('handles unsupported action with UNSUPPORTED_ACTION error', async () => {
      const steps = [
        {
          id: 'step_1',
          action: 'invalid_action' as unknown as WorkspaceRunPlannerAction,
          target: 'todos' as const,
          title: 'Test',
          risk: 'low' as const,
          requiresUserApproval: false,
        },
      ]

      const result = await executeWorkspaceRunSteps(steps, createMockContext())
      const firstResult = result.stepResults[0]?.result

      expect(result.stepResults).toHaveLength(1)
      expect(firstResult?.ok).toBe(false)
      if (firstResult?.ok !== false) {
        throw new Error('Expected unsupported action to fail')
      }
      expect(firstResult.code).toBe('UNSUPPORTED_ACTION')
    })

    it('emits onToolCallStarted and onToolCallCompleted events', async () => {
      const onToolCallStarted = vi.fn()
      const onToolCallCompleted = vi.fn()

      vi.mocked(executeWorkspaceTool).mockResolvedValue({
        ok: true,
        target: 'todos',
        action: 'create',
        item: createAssetItem({ id: 'todo_1' }),
      })

      const steps = [
        {
          id: 'step_1',
          action: 'create_todo' as const,
          target: 'todos' as const,
          title: 'Test todo',
          risk: 'low' as const,
          requiresUserApproval: false,
        },
      ]

      await executeWorkspaceRunSteps(steps, createMockContext(), {
        onToolCallStarted,
        onToolCallCompleted,
      })

      expect(onToolCallStarted).toHaveBeenCalledWith({
        toolName: 'create_todo',
        preview: 'Test todo',
      })
      expect(onToolCallCompleted).toHaveBeenCalledWith({
        toolName: 'create_todo',
        result: expect.objectContaining({ ok: true }),
      })
    })

    it('handles EXECUTION_ERROR when tool throws', async () => {
      const onToolCallStarted = vi.fn()
      const onToolCallCompleted = vi.fn()

      vi.mocked(executeWorkspaceTool).mockRejectedValue(new Error('Tool execution failed'))

      const steps = [
        {
          id: 'step_1',
          action: 'create_todo' as const,
          target: 'todos' as const,
          title: 'Test todo',
          risk: 'low' as const,
          requiresUserApproval: false,
        },
      ]

      const result = await executeWorkspaceRunSteps(steps, createMockContext(), {
        onToolCallStarted,
        onToolCallCompleted,
      })
      const firstResult = result.stepResults[0]?.result

      expect(result.stepResults).toHaveLength(1)
      expect(firstResult?.ok).toBe(false)
      if (firstResult?.ok !== false) {
        throw new Error('Expected thrown tool execution to fail')
      }
      expect(firstResult.code).toBe('EXECUTION_ERROR')
      expect(firstResult.message).toBe('Tool execution failed')
    })

    it('breaks execution loop on first failed step', async () => {
      vi.mocked(executeWorkspaceTool)
        .mockResolvedValueOnce({
          ok: true,
          target: 'todos',
          action: 'create',
          item: createAssetItem({ id: 'todo_1' }),
        })
        .mockResolvedValueOnce({
          ok: false,
          code: 'TOOL_ERROR',
          message: 'Second tool failed',
        })

      const steps = [
        {
          id: 'step_1',
          action: 'create_todo' as const,
          target: 'todos' as const,
          title: 'First',
          risk: 'low' as const,
          requiresUserApproval: false,
        },
        {
          id: 'step_2',
          action: 'create_todo' as const,
          target: 'todos' as const,
          title: 'Second',
          risk: 'low' as const,
          requiresUserApproval: false,
        },
      ]

      const result = await executeWorkspaceRunSteps(steps, createMockContext())

      expect(result.stepResults).toHaveLength(2)
      expect(result.stepResults[0].result.ok).toBe(true)
      expect(result.stepResults[1].result.ok).toBe(false)
    })

    it('builds correct summary with success/total counts', async () => {
      vi.mocked(executeWorkspaceTool)
        .mockResolvedValueOnce({
          ok: true,
          target: 'todos',
          action: 'create',
          item: createAssetItem({ id: 'todo_1' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          target: 'todos',
          action: 'create',
          item: createAssetItem({ id: 'todo_2' }),
        })

      const steps = [
        {
          id: 'step_1',
          action: 'create_todo' as const,
          target: 'todos' as const,
          title: 'First',
          risk: 'low' as const,
          requiresUserApproval: false,
        },
        {
          id: 'step_2',
          action: 'create_todo' as const,
          target: 'todos' as const,
          title: 'Second',
          risk: 'low' as const,
          requiresUserApproval: false,
        },
      ]

      const result = await executeWorkspaceRunSteps(steps, createMockContext())

      expect(result.summary).toBe('执行了 2/2 个步骤')
    })
  })

  describe('isWorkspaceRunExecutorResult', () => {
    it('returns true for valid executor result', () => {
      const validResult = {
        stepResults: [
          {
            stepId: 'step_1',
            toolName: 'create_todo',
            result: { ok: true, target: 'todos', action: 'create', item: createAssetItem() },
          },
        ],
        summary: '执行了 1/1 个步骤',
      }

      expect(isWorkspaceRunExecutorResult(validResult)).toBe(true)
    })

    it('returns false for null', () => {
      expect(isWorkspaceRunExecutorResult(null)).toBe(false)
    })

    it('returns false for undefined', () => {
      expect(isWorkspaceRunExecutorResult(undefined)).toBe(false)
    })

    it('returns false for plain object without stepResults', () => {
      expect(isWorkspaceRunExecutorResult({})).toBe(false)
    })

    it('returns false for stepResults as string', () => {
      expect(isWorkspaceRunExecutorResult({ stepResults: 'not array' })).toBe(false)
    })

    it('returns true for empty stepResults array (valid structure)', () => {
      expect(isWorkspaceRunExecutorResult({ stepResults: [] })).toBe(true)
    })
  })
})
