import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { WorkspaceReviewPendingRunSnapshot } from '@/server/modules/workspace-agent/workspace-run-review'
import type { WorkspaceRunStore } from '@/server/modules/workspace-agent/workspace-run-store'

const fixedNow = new Date('2026-04-27T12:00:00.000Z')

vi.mock('@/shared/time/dayjs', () => ({
  now: vi.fn(() => fixedNow),
}))

const mocks = vi.hoisted(() => ({
  db: {
    query: {
      workspaceRuns: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
    },
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  workspaceRuns: {
    id: Symbol('id'),
    userId: Symbol('userId'),
    runId: Symbol('runId'),
    phase: Symbol('phase'),
    status: Symbol('status'),
    snapshot: Symbol('snapshot'),
    createdAt: Symbol('createdAt'),
    updatedAt: Symbol('updatedAt'),
  },
}))

vi.mock('@/server/lib/db', () => ({
  db: mocks.db,
}))

vi.mock('@/server/lib/db/schema', () => ({
  workspaceRuns: mocks.workspaceRuns,
}))

const { createWorkspaceRunStore } = await import(
  '@/server/modules/workspace-agent/workspace-run-store.drizzle'
)

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

describe('workspace-run-store', () => {
  let store: WorkspaceRunStore

  beforeEach(() => {
    vi.clearAllMocks()
    store = createWorkspaceRunStore()
  })

  describe('saveSnapshot', () => {
    it('inserts new workspace run with upsert', async () => {
      const snapshot = createSnapshot()

      const insertMock = vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
      })
      mocks.db.insert.mockReturnValue({ values: insertMock })

      await store.saveSnapshot(snapshot, 'user_1')

      expect(mocks.db.insert).toHaveBeenCalled()
      expect(insertMock).toHaveBeenCalled()
    })
  })

  describe('loadLatestAwaiting', () => {
    it('returns null when no awaiting runs exist', async () => {
      mocks.db.query.workspaceRuns.findFirst.mockResolvedValue(null)

      const result = await store.loadLatestAwaiting('user_1')

      expect(result).toBeNull()
    })

    it('returns the latest awaiting run snapshot', async () => {
      const snapshot = createSnapshot()
      mocks.db.query.workspaceRuns.findFirst.mockResolvedValue({
        id: 'wr_1',
        userId: 'user_1',
        runId: 'run_1',
        phase: 'review',
        status: 'awaiting_user',
        snapshot,
        createdAt: fixedNow,
        updatedAt: fixedNow,
      })

      const result = await store.loadLatestAwaiting('user_1')

      expect(result).toEqual(snapshot)
    })
  })

  describe('updateRunStatus', () => {
    it('updates the run status', async () => {
      const updateWhereMock = vi.fn().mockResolvedValue({ rowCount: 1 })
      mocks.db.update.mockReturnValue({
        set: vi.fn().mockReturnValue({ where: updateWhereMock }),
      })

      const result = await store.updateRunStatus('run_1', 'user_1', 'completed')

      expect(result).toBe(true)
      expect(mocks.db.update).toHaveBeenCalled()
      expect(updateWhereMock).toHaveBeenCalled()
    })

    it('returns false when no row is affected', async () => {
      const updateWhereMock = vi.fn().mockResolvedValue({ rowCount: 0 })
      mocks.db.update.mockReturnValue({
        set: vi.fn().mockReturnValue({ where: updateWhereMock }),
      })

      const result = await store.updateRunStatus('run_1', 'user_1', 'completed')

      expect(result).toBe(false)
    })
  })

  describe('failAwaitingRuns', () => {
    it('fails all awaiting runs for a user', async () => {
      const updateWhereMock = vi.fn().mockResolvedValue({ rowCount: 3 })
      mocks.db.update.mockReturnValue({
        set: vi.fn().mockReturnValue({ where: updateWhereMock }),
      })

      const result = await store.failAwaitingRuns('user_1')

      expect(result).toBe(3)
      expect(mocks.db.update).toHaveBeenCalled()
      expect(updateWhereMock).toHaveBeenCalled()
    })
  })

  describe('deleteRun', () => {
    it('deletes the run by runId and userId', async () => {
      const deleteWhereMock = vi.fn().mockResolvedValue(undefined)
      mocks.db.delete.mockReturnValue({ where: deleteWhereMock })

      await store.deleteRun('run_1', 'user_1')

      expect(mocks.db.delete).toHaveBeenCalled()
      expect(deleteWhereMock).toHaveBeenCalled()
    })
  })
})
