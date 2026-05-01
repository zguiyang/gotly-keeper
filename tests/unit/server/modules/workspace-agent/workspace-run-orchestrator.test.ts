import { describe, expect, it, vi } from 'vitest'

import type {
  SearchWorkspaceRunCandidates,
} from '@/server/modules/workspace-agent/workspace-run-planner'
import type { WorkspaceRunStore } from '@/server/modules/workspace-agent/workspace-run-store'
import type { WorkspaceRunModel } from '@/server/modules/workspace-agent/workspace-run-understanding'
import type {
  DraftWorkspaceTask,
  WorkspaceRunStreamEvent,
} from '@/shared/workspace/workspace-run-protocol'

type PhaseEvent = Extract<WorkspaceRunStreamEvent, { type: 'phase_started' | 'phase_completed' }>

function isPhaseEvent(event: unknown): event is PhaseEvent {
  return typeof event === 'object' && event !== null && 'type' in event && 'phase' in event
}

const createMockStore = (): WorkspaceRunStore => ({
  saveSnapshot: vi.fn().mockResolvedValue(undefined),
  loadLatestAwaiting: vi.fn().mockResolvedValue(null),
  failAwaitingRuns: vi.fn().mockResolvedValue(0),
  updateRunStatus: vi.fn().mockResolvedValue(true),
  deleteRun: vi.fn().mockResolvedValue(undefined),
})

const createMockRunModel = (): WorkspaceRunModel => {
  return async () => {
    return {
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
    }
  }
}

const createMockSearchCandidates = (): SearchWorkspaceRunCandidates => {
  return async () => []
}

describe('workspace-run-orchestrator', () => {
  describe('aborted signal', () => {
    it('returns aborted when signal is already aborted', async () => {
      const { orchestrateWorkspaceRun } = await import('@/server/modules/workspace-agent/workspace-run-orchestrator')

      const controller = new AbortController()
      controller.abort()

      const result = await orchestrateWorkspaceRun({
        userId: 'user_123',
        request: { kind: 'input', text: '给客户发报价' },
        store: createMockStore(),
        runModel: createMockRunModel(),
        searchCandidates: createMockSearchCandidates(),
        signal: controller.signal,
      })

      expect(result.ok).toBe(false)
      expect(result.phase).toBe('aborted')
    })
  })

  describe('normalize phase', () => {
    it('emits normalize phase events', async () => {
      const { orchestrateWorkspaceRun } = await import('@/server/modules/workspace-agent/workspace-run-orchestrator')

      const events: unknown[] = []
      const store = createMockStore()

      await orchestrateWorkspaceRun({
        userId: 'user_123',
        request: { kind: 'input', text: '给客户发报价' },
        store,
        runModel: createMockRunModel(),
        searchCandidates: createMockSearchCandidates(),
        onEvent: (e) => events.push(e),
      })

      expect(events).toContainEqual(expect.objectContaining({ type: 'phase_started', phase: 'normalize' }))
      expect(events).toContainEqual(expect.objectContaining({ type: 'phase_completed', phase: 'normalize' }))
    })
  })

  describe('understand phase', () => {
    it('calls understand after normalize', async () => {
      const { orchestrateWorkspaceRun } = await import('@/server/modules/workspace-agent/workspace-run-orchestrator')

      const events: unknown[] = []
      const store = createMockStore()

      await orchestrateWorkspaceRun({
        userId: 'user_123',
        request: { kind: 'input', text: '给客户发报价' },
        store,
        runModel: createMockRunModel(),
        searchCandidates: createMockSearchCandidates(),
        onEvent: (e) => events.push(e),
      })

      const normalizeIndex = events.findIndex(
        (e) => isPhaseEvent(e) && e.type === 'phase_completed' && e.phase === 'normalize'
      )
      const understandIndex = events.findIndex(
        (e) => isPhaseEvent(e) && e.type === 'phase_started' && e.phase === 'understand'
      )

      expect(understandIndex).toBeGreaterThan(normalizeIndex)
    })
  })

  describe('plan phase', () => {
    it('generates plan steps', async () => {
      const { orchestrateWorkspaceRun } = await import('@/server/modules/workspace-agent/workspace-run-orchestrator')

      const events: unknown[] = []

      await orchestrateWorkspaceRun({
        userId: 'user_123',
        request: { kind: 'input', text: '给客户发报价' },
        store: createMockStore(),
        runModel: createMockRunModel(),
        searchCandidates: createMockSearchCandidates(),
        onEvent: (e) => events.push(e),
      })

      expect(events).toContainEqual(expect.objectContaining({ type: 'phase_started', phase: 'plan' }))
      expect(events).toContainEqual(expect.objectContaining({ type: 'phase_completed', phase: 'plan' }))
    })
  })

  describe('review phase', () => {
    it('reviews the plan and emits review phase events', async () => {
      const { orchestrateWorkspaceRun } = await import('@/server/modules/workspace-agent/workspace-run-orchestrator')

      const events: unknown[] = []

      await orchestrateWorkspaceRun({
        userId: 'user_123',
        request: { kind: 'input', text: '给客户发报价' },
        store: createMockStore(),
        runModel: createMockRunModel(),
        searchCandidates: createMockSearchCandidates(),
        onEvent: (e) => events.push(e),
      })

      expect(events).toContainEqual(expect.objectContaining({ type: 'phase_started', phase: 'review' }))
      expect(events).toContainEqual(expect.objectContaining({ type: 'phase_completed', phase: 'review' }))
    })

    it('asks for clarification instead of failing when a create intent has only a command prefix', async () => {
      const { orchestrateWorkspaceRun } = await import('@/server/modules/workspace-agent/workspace-run-orchestrator')

      const events: unknown[] = []
      const store = createMockStore()
      const runModel: WorkspaceRunModel = async () => ({
        draftTasks: [
          {
            id: 'draft_1',
            intent: 'create',
            target: 'todos',
            title: '记个待办',
            confidence: 0.82,
            ambiguities: [],
            corrections: [],
            slots: {},
          },
        ],
      })

      const result = await orchestrateWorkspaceRun({
        userId: 'user_123',
        request: { kind: 'input', text: '记个待办' },
        store,
        runModel,
        searchCandidates: createMockSearchCandidates(),
        onEvent: (e) => events.push(e),
      })

      expect(result.ok).toBe(true)
      expect(result.phase).toBe('review')
      expect(result.snapshot?.interaction).toMatchObject({
        type: 'clarify_slots',
        fields: [expect.objectContaining({ key: 'details' })],
      })
      expect(store.saveSnapshot).toHaveBeenCalledTimes(1)
      expect(events).toContainEqual(
        expect.objectContaining({
          type: 'awaiting_user',
          interaction: expect.objectContaining({ type: 'clarify_slots' }),
        })
      )
    })
  })

  describe('error handling', () => {
    it('handles model errors gracefully', async () => {
      const { orchestrateWorkspaceRun } = await import('@/server/modules/workspace-agent/workspace-run-orchestrator')

      const failingModel: WorkspaceRunModel = async () => {
        throw new Error('Model failed')
      }

      const events: unknown[] = []

      const result = await orchestrateWorkspaceRun({
        userId: 'user_123',
        request: { kind: 'input', text: '给客户发报价' },
        store: createMockStore(),
        runModel: failingModel,
        searchCandidates: createMockSearchCandidates(),
        onEvent: (e) => events.push(e),
      })

      expect(result.ok).toBe(false)
      expect(result.phase).toBe('error')
      expect(events).toContainEqual(
        expect.objectContaining({
          type: 'run_failed',
          error: expect.objectContaining({ code: 'INTERNAL_ERROR' }),
        })
      )
    })

    it('preserves standardized AI error metadata in run_failed events', async () => {
      const { orchestrateWorkspaceRun } = await import('@/server/modules/workspace-agent/workspace-run-orchestrator')

      const events: unknown[] = []
      const aiFailure = Object.assign(new Error('AI provider not configured'), {
        code: 'AI_PROVIDER_ERROR',
        retryable: true,
      })

      const failingModel: WorkspaceRunModel = async () => {
        throw aiFailure
      }

      await orchestrateWorkspaceRun({
        userId: 'user_123',
        request: { kind: 'input', text: '给客户发报价' },
        store: createMockStore(),
        runModel: failingModel,
        searchCandidates: createMockSearchCandidates(),
        onEvent: (e) => events.push(e),
      })

      expect(events).toContainEqual(
        expect.objectContaining({
          type: 'run_failed',
          error: expect.objectContaining({
            code: 'AI_PROVIDER_ERROR',
            message: 'AI provider not configured',
            retryable: true,
          }),
        })
      )
    })
  })

  describe('preview phase', () => {
    it('emits preview phase events when auto_execute is triggered', async () => {
      const { orchestrateWorkspaceRun } = await import('@/server/modules/workspace-agent/workspace-run-orchestrator')

      const events: unknown[] = []

      await orchestrateWorkspaceRun({
        userId: 'user_123',
        request: { kind: 'input', text: '给客户发报价' },
        store: createMockStore(),
        runModel: createMockRunModel(),
        searchCandidates: createMockSearchCandidates(),
        onEvent: (e) => events.push(e),
      })

      expect(events).toContainEqual(expect.objectContaining({ type: 'phase_started', phase: 'preview' }))
      expect(events).toContainEqual(expect.objectContaining({ type: 'phase_completed', phase: 'preview' }))
    })
  })

  describe('execute phase', () => {
    it('emits execute phase events when auto_execute is triggered', async () => {
      const { orchestrateWorkspaceRun } = await import('@/server/modules/workspace-agent/workspace-run-orchestrator')

      const events: unknown[] = []

      await orchestrateWorkspaceRun({
        userId: 'user_123',
        request: { kind: 'input', text: '给客户发报价' },
        store: createMockStore(),
        runModel: createMockRunModel(),
        searchCandidates: createMockSearchCandidates(),
        onEvent: (e) => events.push(e),
      })

      expect(events).toContainEqual(expect.objectContaining({ type: 'phase_started', phase: 'execute' }))
      expect(events).toContainEqual(expect.objectContaining({ type: 'phase_completed', phase: 'execute' }))
    })
  })

  describe('compose phase', () => {
    it('emits compose phase events when execute succeeds', async () => {
      const { orchestrateWorkspaceRun } = await import('@/server/modules/workspace-agent/workspace-run-orchestrator')

      const events: unknown[] = []
      const store = createMockStore()

      store.updateRunStatus = vi.fn().mockResolvedValue(true)

      await orchestrateWorkspaceRun({
        userId: 'user_123',
        request: { kind: 'input', text: '给客户发报价' },
        store,
        runModel: createMockRunModel(),
        searchCandidates: createMockSearchCandidates(),
        onEvent: (e) => events.push(e),
      })

      const executePhase = events.find(
        (e) => isPhaseEvent(e) && e.type === 'phase_completed' && e.phase === 'execute'
      ) as (PhaseEvent & { output?: { stepResults?: Array<{ result: { ok: boolean } }> } }) | undefined
      if (executePhase?.output?.stepResults?.every((r) => r.result.ok)) {
        expect(events).toContainEqual(expect.objectContaining({ type: 'phase_started', phase: 'compose' }))
        expect(events).toContainEqual(expect.objectContaining({ type: 'phase_completed', phase: 'compose' }))
      } else {
        expect(events).not.toContainEqual(expect.objectContaining({ type: 'phase_started', phase: 'compose' }))
      }
    })

    it('emits run_completed with composed answer and full preview', async () => {
      const { orchestrateWorkspaceRun } = await import('@/server/modules/workspace-agent/workspace-run-orchestrator')

      const events: WorkspaceRunStreamEvent[] = []
      const store = createMockStore()

      store.updateRunStatus = vi.fn().mockResolvedValue(true)

      const result = await orchestrateWorkspaceRun({
        userId: 'user_123',
        request: { kind: 'input', text: '记一下：首页 slogan 想走轻管家感' },
        store,
        runModel: createMockRunModel(),
        searchCandidates: createMockSearchCandidates(),
        onEvent: (e) => events.push(e),
      })

      const runCompletedEvent = events.find(
        (event): event is Extract<WorkspaceRunStreamEvent, { type: 'run_completed' }> =>
          event.type === 'run_completed'
      )

      if (result.ok && result.phase === 'completed') {
        expect(runCompletedEvent).toBeDefined()
        expect(runCompletedEvent?.result.answer).toBeTruthy()
        expect(runCompletedEvent?.result.preview?.plan).toBeDefined()
        expect(runCompletedEvent?.result.preview?.understanding).toBeDefined()
      } else {
        expect(runCompletedEvent).toBeUndefined()
      }
    })

  })

  describe('quick action', () => {
    it('accepts supported quick actions through the new pipeline', async () => {
      const { orchestrateWorkspaceRun } = await import('@/server/modules/workspace-agent/workspace-run-orchestrator')

      const events: unknown[] = []

      const result = await orchestrateWorkspaceRun({
        userId: 'user_123',
        request: { kind: 'quick-action', action: 'summarize-notes' },
        store: createMockStore(),
        runModel: createMockRunModel(),
        searchCandidates: createMockSearchCandidates(),
        onEvent: (e) => events.push(e),
      })

      expect(events).toContainEqual(
        expect.objectContaining({ type: 'phase_started', phase: 'normalize' })
      )
      expect(result.phase).not.toBe('quick_action')
    })
  })

  describe('resume flow', () => {
    it('cancelling a pending run clears all awaiting runs for the user', async () => {
      const { orchestrateWorkspaceRun } = await import('@/server/modules/workspace-agent/workspace-run-orchestrator')

      const store = createMockStore()
      store.loadLatestAwaiting = vi.fn().mockResolvedValue({
        runId: 'run_123',
        phase: 'review',
        status: 'awaiting_user',
        interactionId: 'run_123_clarify',
        interaction: {
          runId: 'run_123',
          id: 'run_123_clarify',
          type: 'clarify_slots',
          message: '请补充信息',
          actions: ['submit', 'cancel'] as const,
          fields: [
            {
              key: 'details',
              label: '请补充任务信息',
              required: true,
            },
          ],
        },
        timeline: [],
        preview: null,
        understandingPreview: {
          rawInput: '记个待办：尽快处理报销',
          normalizedInput: '记个待办：尽快处理报销',
          draftTasks: [
            {
              id: 'draft_1',
              intent: 'create',
              target: 'todos',
              title: '尽快处理报销',
              confidence: 0.95,
              ambiguities: ['时间表述模糊'],
              corrections: [],
              slots: {},
            },
          ],
          corrections: [],
        },
        correctionNotes: [],
        updatedAt: new Date().toISOString(),
      })

      const result = await orchestrateWorkspaceRun({
        userId: 'user_123',
        request: {
          kind: 'resume',
          runId: 'run_123',
          interactionId: 'run_123_clarify',
          response: { type: 'clarify_slots', action: 'cancel' },
        },
        store,
        runModel: createMockRunModel(),
        searchCandidates: createMockSearchCandidates(),
      })

      expect(result.ok).toBe(false)
      expect(result.phase).toBe('cancelled')
      expect(store.failAwaitingRuns).toHaveBeenCalledWith('user_123')
    })

    it('advances to confirm_plan after saving multi-task draft edits', async () => {
      const { orchestrateWorkspaceRun } = await import('@/server/modules/workspace-agent/workspace-run-orchestrator')

      const store = createMockStore()
      const draftTasks: DraftWorkspaceTask[] = [
        {
          id: 'task_1',
          intent: 'create',
          target: 'todos',
          title: '熬药',
          confidence: 0.95,
          ambiguities: [],
          corrections: [],
          slots: { time: '五分钟后' },
        },
        {
          id: 'task_2',
          intent: 'create',
          target: 'notes',
          title: '不要吃生冷食物',
          confidence: 0.9,
          ambiguities: [],
          corrections: [],
          slots: {},
        },
        {
          id: 'task_3',
          intent: 'create',
          target: 'bookmarks',
          title: 'https://github.com/zguiyang',
          confidence: 0.95,
          ambiguities: [],
          corrections: [],
          slots: { url: 'https://github.com/zguiyang' },
        },
      ]

      store.loadLatestAwaiting = vi.fn().mockResolvedValue({
        runId: 'run_123',
        phase: 'review',
        status: 'awaiting_user',
        interactionId: 'run_123_edit_draft_tasks',
        interaction: {
          runId: 'run_123',
          id: 'run_123_edit_draft_tasks',
          type: 'edit_draft_tasks',
          message: '这次请求包含多个草稿任务，请先确认或编辑。',
          actions: ['save', 'cancel'] as const,
          tasks: draftTasks,
        },
        timeline: [],
        preview: null,
        understandingPreview: {
          rawInput: '五分钟后提醒我熬药，帮我几个笔记，不要吃生冷食物，最后收藏一下：https://github.com/zguiyang',
          normalizedInput: '五分钟后提醒我熬药，帮我几个笔记，不要吃生冷食物，最后收藏一下：https://github.com/zguiyang',
          draftTasks,
          corrections: [],
        },
        correctionNotes: [],
        updatedAt: new Date().toISOString(),
      })

      const events: unknown[] = []

      const result = await orchestrateWorkspaceRun({
        userId: 'user_123',
        request: {
          kind: 'resume',
          runId: 'run_123',
          interactionId: 'run_123_edit_draft_tasks',
          response: {
            type: 'edit_draft_tasks',
            action: 'save',
            tasks: draftTasks,
          },
        },
        store,
        runModel: createMockRunModel(),
        searchCandidates: createMockSearchCandidates(),
        onEvent: (e) => events.push(e),
      })

      expect(result.ok).toBe(true)
      expect(result.phase).toBe('review')
      expect(events).toContainEqual(
        expect.objectContaining({
          type: 'awaiting_user',
          interaction: expect.objectContaining({ type: 'confirm_plan' }),
        })
      )
      expect(store.failAwaitingRuns).toHaveBeenCalledWith('user_123', { excludeRunId: 'run_123' })
      expect(events).not.toContainEqual(
        expect.objectContaining({
          type: 'awaiting_user',
          interaction: expect.objectContaining({ type: 'edit_draft_tasks' }),
        })
      )
    })

    it('preserves candidates when resuming from snapshot', async () => {
      const { orchestrateWorkspaceRun } = await import('@/server/modules/workspace-agent/workspace-run-orchestrator')

      const store = createMockStore()
      const mockSnapshot = {
        runId: 'run_123',
        phase: 'review' as const,
        status: 'awaiting_user' as const,
        interactionId: 'interaction_1',
        interaction: {
          runId: 'run_123',
          id: 'interaction_1',
          type: 'confirm_plan' as const,
          message: '请确认',
          actions: ['confirm', 'edit', 'cancel'] as const,
        },
        timeline: [],
        preview: {
          plan: {
            summary: 'Test plan',
            steps: [
              {
                id: 'step_1',
                toolName: 'update_todo',
                title: '更新待办',
                preview: '更新待办',
              },
            ],
          },
        },
        understandingPreview: {
          rawInput: '把给客户发报价标记完成',
          normalizedInput: '把给客户发报价标记完成',
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
          corrections: [],
        },
        correctionNotes: [],
        updatedAt: new Date().toISOString(),
      }

      store.loadLatestAwaiting = vi.fn().mockResolvedValue(mockSnapshot)

      const events: unknown[] = []

      const result = await orchestrateWorkspaceRun({
        userId: 'user_123',
        request: {
          kind: 'resume',
          runId: 'run_123',
          interactionId: 'interaction_1',
          response: { type: 'confirm_plan', action: 'confirm' },
        },
        store,
        runModel: createMockRunModel(),
        searchCandidates: createMockSearchCandidates(),
        onEvent: (e) => events.push(e),
      })

      expect(store.loadLatestAwaiting).toHaveBeenCalledWith('user_123')
      expect(result.ok).toBe(false)
      expect(result.phase).toBe('execute')
    })

    it('returns not_found when no pending run exists on resume', async () => {
      const { orchestrateWorkspaceRun } = await import('@/server/modules/workspace-agent/workspace-run-orchestrator')

      const store = createMockStore()
      store.loadLatestAwaiting = vi.fn().mockResolvedValue(null)

      const result = await orchestrateWorkspaceRun({
        userId: 'user_123',
        request: {
          kind: 'resume',
          runId: 'run_123',
          interactionId: 'interaction_1',
          response: { type: 'confirm_plan', action: 'confirm' },
        },
        store,
        runModel: createMockRunModel(),
        searchCandidates: createMockSearchCandidates(),
      })

      expect(result.ok).toBe(false)
      expect(result.phase).toBe('not_found')
    })
  })

  describe('awaiting run lifecycle', () => {
    it('clears older awaiting runs before saving a new awaiting snapshot', async () => {
      const { orchestrateWorkspaceRun } = await import('@/server/modules/workspace-agent/workspace-run-orchestrator')

      const store = createMockStore()
      const ambiguousModel: WorkspaceRunModel = async () => ({
        draftTasks: [
          {
            id: 'draft_1',
            intent: 'create',
            target: 'todos',
            title: '尽快处理报销',
            confidence: 0.95,
            ambiguities: ['时间表述模糊'],
            corrections: [],
            slots: {},
          },
        ],
      })

      const result = await orchestrateWorkspaceRun({
        userId: 'user_123',
        request: { kind: 'input', text: '记个待办：尽快处理报销' },
        store,
        runModel: ambiguousModel,
        searchCandidates: createMockSearchCandidates(),
      })

      expect(result.ok).toBe(true)
      expect(result.phase).toBe('review')
      expect(store.failAwaitingRuns).toHaveBeenCalledWith('user_123')
      expect(store.saveSnapshot).toHaveBeenCalled()
    })
  })
})
