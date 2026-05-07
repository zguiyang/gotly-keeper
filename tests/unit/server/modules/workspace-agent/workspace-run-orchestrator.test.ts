import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ReviewableDuplicateCandidate } from '@/server/modules/workspace-agent/workspace-run-duplicates'
import type {
  SearchWorkspaceRunCandidates,
} from '@/server/modules/workspace-agent/workspace-run-planner'
import type { WorkspaceRunStore } from '@/server/modules/workspace-agent/workspace-run-store'
import type { WorkspaceRunModel } from '@/server/modules/workspace-agent/workspace-run-understanding'
import type {
  DraftWorkspaceTask,
  WorkspaceRunStreamEvent,
} from '@/shared/workspace/workspace-run-protocol'

const duplicateCandidatesMock = vi.hoisted(() => ({
  findWorkspaceRunDuplicateCandidates: vi.fn<() => Promise<ReviewableDuplicateCandidate[]>>(async () => []),
  findWorkspaceBookmarkDuplicateCandidate: vi.fn<() => Promise<ReviewableDuplicateCandidate | null>>(async () => null),
  findWorkspaceBookmarkDuplicateCandidates: vi.fn<() => Promise<ReviewableDuplicateCandidate[]>>(async () => []),
}))

vi.mock('@/server/modules/workspace-agent/workspace-run-duplicates', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/server/modules/workspace-agent/workspace-run-duplicates')>()

  return {
    ...actual,
    findWorkspaceRunDuplicateCandidates: duplicateCandidatesMock.findWorkspaceRunDuplicateCandidates,
    findWorkspaceBookmarkDuplicateCandidate: duplicateCandidatesMock.findWorkspaceBookmarkDuplicateCandidate,
    findWorkspaceBookmarkDuplicateCandidates: duplicateCandidatesMock.findWorkspaceBookmarkDuplicateCandidates,
  }
})

const executorMock = vi.hoisted(() => ({
  executeWorkspaceRunSteps: vi.fn().mockResolvedValue({
    stepResults: [
      {
        stepId: 'step_1',
        toolName: 'create_todo',
        result: { ok: true, target: 'todos', action: 'create', item: null },
      },
    ],
    summary: '执行了 1/1 个步骤',
  }),
}))

vi.mock('@/server/modules/workspace-agent/workspace-run-executor', () => ({
  executeWorkspaceRunSteps: executorMock.executeWorkspaceRunSteps,
}))

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
  return async ({ userPrompt }) => {
    if (userPrompt.includes('<raw_text>')) {
      return {
        rawText: '给客户发报价',
        normalizedText: '给客户发报价',
        urls: [],
        separators: [],
        typoCandidates: [],
        timeHints: [],
      }
    }

    if (userPrompt.includes('<normalized_input>') && !userPrompt.includes('<inherited_corrections>')) {
      return {
        isMultiTask: false,
        corrections: [],
        segments: [
          {
            id: 'segment_1',
            text: '给客户发报价',
            relation: 'independent',
            confidence: 0.95,
          },
        ],
      }
    }

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
  beforeEach(() => {
    vi.clearAllMocks()
    duplicateCandidatesMock.findWorkspaceRunDuplicateCandidates.mockResolvedValue([])
    duplicateCandidatesMock.findWorkspaceBookmarkDuplicateCandidate.mockResolvedValue(null)
    duplicateCandidatesMock.findWorkspaceBookmarkDuplicateCandidates.mockResolvedValue([])
  })

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

    it('runs semantic split before understanding each independent segment', async () => {
      const { orchestrateWorkspaceRun } = await import('@/server/modules/workspace-agent/workspace-run-orchestrator')

      const events: unknown[] = []
      const store = createMockStore()
      const runModel = vi
        .fn<WorkspaceRunModel>()
        .mockResolvedValueOnce({
          rawText: '记个待办：明天下午三点给产品经理发报价；再记一下：首页 slogan 想走轻管家感',
          normalizedText: '记个待办：明天下午三点给产品经理发报价；再记一下：首页 slogan 想走轻管家感',
          urls: [],
          separators: ['；'],
          typoCandidates: [],
          timeHints: ['明天下午三点'],
        })
        .mockResolvedValueOnce({
          isMultiTask: true,
          corrections: [],
          segments: [
            {
              id: 'segment_1',
              text: '记个待办：明天下午三点给产品经理发报价',
              relation: 'independent',
              confidence: 0.96,
            },
            {
              id: 'segment_2',
              text: '再记一下：首页 slogan 想走轻管家感',
              relation: 'independent',
              confidence: 0.94,
            },
          ],
        })
        .mockResolvedValueOnce({
          draftTasks: [
            {
              id: 'task_1',
              intent: 'create',
              target: 'todos',
              title: '给产品经理发报价',
              hasRealContent: true,
              confidence: 0.92,
              ambiguities: [],
              corrections: [],
              slots: { timeText: '明天下午三点' },
            },
          ],
        })
        .mockResolvedValueOnce({
          draftTasks: [
            {
              id: 'task_2',
              intent: 'create',
              target: 'notes',
              title: '首页 slogan 想走轻管家感',
              hasRealContent: true,
              confidence: 0.9,
              ambiguities: [],
              corrections: [],
              slots: {},
            },
          ],
        })

      await orchestrateWorkspaceRun({
        userId: 'user_123',
        request: {
          kind: 'input',
          text: '记个待办：明天下午三点给产品经理发报价；再记一下：首页 slogan 想走轻管家感',
        },
        store,
        runModel,
        searchCandidates: createMockSearchCandidates(),
        onEvent: (e) => events.push(e),
      })

      const normalizeIndex = events.findIndex(
        (e) => isPhaseEvent(e) && e.type === 'phase_completed' && e.phase === 'normalize'
      )
      const splitIndex = events.findIndex(
        (e) => isPhaseEvent(e) && e.type === 'phase_started' && e.phase === 'semantic_split'
      )
      const understandIndex = events.findIndex(
        (e) => isPhaseEvent(e) && e.type === 'phase_started' && e.phase === 'understand'
      )

      expect(splitIndex).toBeGreaterThan(normalizeIndex)
      expect(understandIndex).toBeGreaterThan(splitIndex)
      expect(runModel).toHaveBeenCalledTimes(4)
      expect(runModel.mock.calls[2]?.[0]).toEqual(
        expect.objectContaining({
          userPrompt: expect.stringContaining('记个待办：明天下午三点给产品经理发报价'),
        })
      )
      expect(runModel.mock.calls[3]?.[0]).toEqual(
        expect.objectContaining({
          userPrompt: expect.stringContaining('再记一下：首页 slogan 想走轻管家感'),
        })
      )
    })

    it('keeps T06 multi-task acceptance input split into todo plus note', async () => {
      const { orchestrateWorkspaceRun } = await import('@/server/modules/workspace-agent/workspace-run-orchestrator')

      executorMock.executeWorkspaceRunSteps.mockResolvedValueOnce({
        stepResults: [
          {
            stepId: 'step_1',
            toolName: 'create_todo',
            result: { ok: true, target: 'todos', action: 'create', item: { title: '和设计过一下 RQA0506D 验收' } },
          },
          {
            stepId: 'step_2',
            toolName: 'create_note',
            result: { ok: true, target: 'notes', action: 'create', item: { title: 'RQA0506E 小白用户更希望查询别总确认' } },
          },
        ],
        summary: '执行了 2/2 个步骤',
      })

      const result = await orchestrateWorkspaceRun({
        userId: 'user_123',
        request: {
          kind: 'input',
          text: '记个待办：5月9日上午11点和设计过一下 RQA0506D 验收；再记一下：RQA0506E 小白用户更希望查询别总确认',
        },
        store: createMockStore(),
        runModel: vi
          .fn<WorkspaceRunModel>()
          .mockResolvedValueOnce({
            rawText: '记个待办：5月9日上午11点和设计过一下 RQA0506D 验收；再记一下：RQA0506E 小白用户更希望查询别总确认',
            normalizedText: '记个待办：5月9日上午11点和设计过一下 RQA0506D 验收；再记一下：RQA0506E 小白用户更希望查询别总确认',
            urls: [],
            separators: ['；'],
            typoCandidates: [],
            timeHints: ['5月9日上午11点'],
          })
          .mockResolvedValueOnce({
            isMultiTask: true,
            corrections: [],
            segments: [
              {
                id: 'segment_1',
                text: '记个待办：5月9日上午11点和设计过一下 RQA0506D 验收',
                relation: 'independent',
                confidence: 0.97,
              },
              {
                id: 'segment_2',
                text: '再记一下：RQA0506E 小白用户更希望查询别总确认',
                relation: 'independent',
                confidence: 0.95,
              },
            ],
          })
          .mockResolvedValueOnce({
            draftTasks: [
              {
                id: 'task_1',
                intent: 'create',
                target: 'todos',
                title: '和设计过一下 RQA0506D 验收',
                hasRealContent: true,
                confidence: 0.93,
                ambiguities: [],
                corrections: [],
                slots: {
                  dueAt: '2026-05-09T11:00:00.000Z',
                  timeText: '5月9日上午11点',
                },
              },
            ],
          })
          .mockResolvedValueOnce({
            draftTasks: [
              {
                id: 'task_2',
                intent: 'create',
                target: 'notes',
                title: 'RQA0506E 小白用户更希望查询别总确认',
                hasRealContent: true,
                confidence: 0.91,
                ambiguities: [],
                corrections: [],
                slots: {},
              },
            ],
          }),
        searchCandidates: createMockSearchCandidates(),
      })

      expect(result.ok).toBe(true)
      expect(result.phase).toBe('completed')
      if (!result.ok || result.phase !== 'completed') {
        throw new Error('Expected completed result for T06 acceptance input')
      }
      const completedResult = result.result ?? null
      expect(completedResult?.preview?.understanding?.draftTasks.map((task) => task.target)).toEqual([
        'todos',
        'notes',
      ])
    })

    it('keeps T07 typo tolerance acceptance input on the direct todo-create path', async () => {
      const { orchestrateWorkspaceRun } = await import('@/server/modules/workspace-agent/workspace-run-orchestrator')

      const events: unknown[] = []
      const result = await orchestrateWorkspaceRun({
        userId: 'user_123',
        request: {
          kind: 'input',
          text: '记个待半：5月10日早上买燕麦奶 RQA0507F',
        },
        store: createMockStore(),
        runModel: vi
          .fn<WorkspaceRunModel>()
          .mockResolvedValueOnce({
            rawText: '记个待半：5月10日早上买燕麦奶 RQA0507F',
            normalizedText: '记个待半：5月10日早上买燕麦奶 RQA0507F',
            urls: [],
            separators: [],
            typoCandidates: [{ text: '待半', suggestion: '待办' }],
            timeHints: ['5月10日早上'],
          })
          .mockResolvedValueOnce({
            isMultiTask: false,
            corrections: [
              {
                from: '待半',
                to: '待办',
                reason: 'typo',
              },
            ],
            segments: [
              {
                id: 'segment_1',
                text: '记个待办：5月10日早上买燕麦奶 RQA0507F',
                relation: 'independent',
                confidence: 0.96,
              },
            ],
          })
          .mockResolvedValueOnce({
            draftTasks: [
              {
                id: 'task_1',
                intent: 'create',
                target: 'todos',
                title: '买燕麦奶 RQA0507F',
                hasRealContent: true,
                confidence: 0.92,
                ambiguities: [],
                corrections: [],
                slots: {
                  dueAt: '2026-05-10T08:00:00.000Z',
                  timeText: '5月10日早上',
                },
              },
            ],
          }),
        searchCandidates: createMockSearchCandidates(),
        onEvent: (e) => events.push(e),
      })

      expect(result.ok).toBe(true)
      expect(result.phase).toBe('completed')
      expect(events).not.toContainEqual(
        expect.objectContaining({
          type: 'awaiting_user',
          interaction: expect.objectContaining({ type: 'clarify_slots' }),
        })
      )
      if (!result.ok || result.phase !== 'completed') {
        throw new Error('Expected completed result for T07 acceptance input')
      }
      const completedResult = result.result ?? null
      expect(completedResult?.preview?.understanding?.corrections).toEqual(['待半->待办 (typo)'])
    })

    it('preserves normalization typo corrections even when semantic split does not rewrite the wording', async () => {
      const { orchestrateWorkspaceRun } = await import('@/server/modules/workspace-agent/workspace-run-orchestrator')

      const result = await orchestrateWorkspaceRun({
        userId: 'user_123',
        request: {
          kind: 'input',
          text: '记个待半：5月10日早上买燕麦奶 RQA0507F2',
        },
        store: createMockStore(),
        runModel: vi
          .fn<WorkspaceRunModel>()
          .mockResolvedValueOnce({
            rawText: '记个待半：5月10日早上买燕麦奶 RQA0507F2',
            normalizedText: '记个待半：5月10日早上买燕麦奶 RQA0507F2',
            urls: [],
            separators: [],
            typoCandidates: [{ text: '待半', suggestion: '待办' }],
            timeHints: ['5月10日早上'],
          })
          .mockResolvedValueOnce({
            isMultiTask: false,
            corrections: [],
            segments: [
              {
                id: 'segment_1',
                text: '记个待半：5月10日早上买燕麦奶 RQA0507F2',
                relation: 'independent',
                confidence: 0.96,
              },
            ],
          })
          .mockResolvedValueOnce({
            draftTasks: [
              {
                id: 'task_1',
                intent: 'create',
                target: 'todos',
                title: '买燕麦奶 RQA0507F2',
                hasRealContent: true,
                confidence: 0.92,
                ambiguities: [],
                corrections: [],
                slotEntries: [
                  { key: 'timeText', value: '5月10日早上' },
                ],
              },
            ],
          }),
        searchCandidates: createMockSearchCandidates(),
      })

      expect(result.ok).toBe(true)
      expect(result.phase).toBe('completed')
      if (!result.ok || result.phase !== 'completed') {
        throw new Error('Expected completed result for typo tolerance fallback input')
      }

      expect(result.result?.preview?.understanding?.corrections).toEqual(['待半->待办 (typo)'])
    })

    it('applies typo corrections before understanding so the todo path stays clear', async () => {
      const { orchestrateWorkspaceRun } = await import('@/server/modules/workspace-agent/workspace-run-orchestrator')

      const events: unknown[] = []
      let callCount = 0
      const runModel = vi.fn<WorkspaceRunModel>().mockImplementation(async ({ userPrompt }) => {
        callCount += 1

        if (callCount === 1) {
          return {
            rawText: '记个待半：5月10日早上买燕麦奶 RQA0507F3',
            normalizedText: '记个待半：5月10日早上买燕麦奶 RQA0507F3',
            urls: [],
            separators: [],
            typoCandidates: [{ text: '待半', suggestion: '待办' }],
            timeHints: ['5月10日早上'],
          }
        }

        if (callCount === 2) {
          if (userPrompt.includes('待办')) {
            return {
              isMultiTask: false,
              corrections: [
                {
                  from: '待半',
                  to: '待办',
                  reason: 'typo',
                },
              ],
              segments: [
                {
                  id: 'segment_1',
                  text: '记个待办：5月10日早上买燕麦奶 RQA0507F3',
                  relation: 'independent',
                  confidence: 0.96,
                },
              ],
            }
          }

          return {
            isMultiTask: false,
            corrections: [],
            segments: [
              {
                id: 'segment_1',
                text: '记个待半：5月10日早上买燕麦奶 RQA0507F3',
                relation: 'independent',
                confidence: 0.96,
              },
            ],
          }
        }

        if (callCount === 3) {
          if (userPrompt.includes('待办')) {
            return {
              draftTasks: [
                {
                  id: 'task_1',
                  intent: 'create',
                  target: 'todos',
                  title: '买燕麦奶 RQA0507F3',
                  hasRealContent: true,
                  confidence: 0.92,
                  ambiguities: [],
                  corrections: [],
                  slots: {
                    dueAt: '2026-05-10T08:00:00.000Z',
                    timeText: '5月10日早上',
                  },
                },
              ],
            }
          }

          return {
            draftTasks: [
              {
                id: 'task_1',
                intent: 'create',
                target: 'mixed',
                title: '记个待半：5月10日早上买燕麦奶 RQA0507F3',
                hasRealContent: true,
                confidence: 0.72,
                ambiguities: ['还不确定记录类型和具体内容'],
                corrections: [],
                slots: {
                  timeText: '5月10日早上',
                },
              },
            ],
          }
        }

        throw new Error(`Unexpected model call ${callCount}`)
      })

      const result = await orchestrateWorkspaceRun({
        userId: 'user_123',
        request: {
          kind: 'input',
          text: '记个待半：5月10日早上买燕麦奶 RQA0507F3',
        },
        store: createMockStore(),
        runModel,
        searchCandidates: createMockSearchCandidates(),
        onEvent: (e) => events.push(e),
      })

      expect(result.ok).toBe(true)
      expect(result.phase).toBe('completed')
      expect(events).not.toContainEqual(
        expect.objectContaining({
          type: 'awaiting_user',
          interaction: expect.objectContaining({ type: 'clarify_slots' }),
        })
      )
      if (!result.ok || result.phase !== 'completed') {
        throw new Error('Expected completed result when typo corrections are applied early')
      }
      expect(result.result?.preview?.understanding?.normalizedInput).toContain('待办')
      expect(result.result?.preview?.understanding?.corrections).toEqual(['待半->待办 (typo)'])
    })

    it('keeps T12 duplicate bookmark acceptance input in duplicate confirmation instead of execution failure', async () => {
      const { orchestrateWorkspaceRun } = await import('@/server/modules/workspace-agent/workspace-run-orchestrator')

      duplicateCandidatesMock.findWorkspaceBookmarkDuplicateCandidate.mockResolvedValueOnce({
        stepId: 'step_1',
        target: 'bookmark',
        duplicates: [
          {
            id: 'bookmark_1',
            label: 'https://example.com/rqa0506c',
            reason: 'URL already exists',
          },
        ],
      })

      const result = await orchestrateWorkspaceRun({
        userId: 'user_123',
        request: {
          kind: 'input',
          text: '把这个链接存一下，真实验收回看用：https://example.com/rqa0506c',
        },
        store: createMockStore(),
        runModel: vi
          .fn<WorkspaceRunModel>()
          .mockResolvedValueOnce({
            rawText: '把这个链接存一下，真实验收回看用：https://example.com/rqa0506c',
            normalizedText: '把这个链接存一下，真实验收回看用：https://example.com/rqa0506c',
            urls: ['https://example.com/rqa0506c'],
            separators: ['，'],
            typoCandidates: [],
            timeHints: [],
          })
          .mockResolvedValueOnce({
            isMultiTask: false,
            corrections: [],
            segments: [
              {
                id: 'segment_1',
                text: '把这个链接存一下，真实验收回看用：https://example.com/rqa0506c',
                relation: 'independent',
                confidence: 0.97,
              },
            ],
          })
          .mockResolvedValueOnce({
            draftTasks: [
              {
                id: 'task_1',
                intent: 'create',
                target: 'bookmarks',
                title: '真实验收回看用',
                hasRealContent: true,
                confidence: 0.95,
                ambiguities: [],
                corrections: [],
                slots: {
                  url: 'https://example.com/rqa0506c',
                  note: '真实验收回看用',
                },
              },
            ],
          }),
        searchCandidates: createMockSearchCandidates(),
      })

      expect(result.ok).toBe(true)
      expect(result.phase).toBe('review')
      expect(result.snapshot?.interaction).toMatchObject({
        type: 'confirm_duplicate',
        target: 'bookmark',
      })
      expect(duplicateCandidatesMock.findWorkspaceBookmarkDuplicateCandidate).toHaveBeenCalledTimes(1)
      expect(duplicateCandidatesMock.findWorkspaceRunDuplicateCandidates).not.toHaveBeenCalled()
      expect(executorMock.executeWorkspaceRunSteps).not.toHaveBeenCalled()
    })

    it('keeps T13 repeated explicit note capture acceptance input on create_note even if planning hints drift', async () => {
      const { orchestrateWorkspaceRun } = await import('@/server/modules/workspace-agent/workspace-run-orchestrator')

      const runModel = vi
        .fn<WorkspaceRunModel>()
        .mockResolvedValueOnce({
          rawText: '记一下：RQA0507H 这个结论要同步一下；再记一下：RQA0507H 这个结论要同步一下',
          normalizedText: '记一下：RQA0507H 这个结论要同步一下；再记一下：RQA0507H 这个结论要同步一下',
          urls: [],
          separators: ['；'],
          typoCandidates: [],
          timeHints: [],
        })
        .mockResolvedValueOnce({
          isMultiTask: true,
          corrections: [],
          segments: [
            {
              id: 'segment_1',
              text: '记一下：RQA0507H 这个结论要同步一下',
              relation: 'independent',
              confidence: 0.96,
            },
            {
              id: 'segment_2',
              text: '再记一下：RQA0507H 这个结论要同步一下',
              relation: 'independent',
              confidence: 0.95,
            },
          ],
        })
        .mockResolvedValueOnce({
          draftTasks: [
            {
              id: 'task_1',
              intent: 'create',
              target: 'notes',
              title: 'RQA0507H 这个结论要同步一下',
              hasRealContent: true,
              confidence: 0.74,
              ambiguities: ['capture_wording'],
              corrections: [],
              slots: {
                content: 'RQA0507H 这个结论要同步一下',
              },
            },
          ],
        })
        .mockResolvedValueOnce({
          draftTasks: [
            {
              id: 'task_2',
              intent: 'create',
              target: 'notes',
              title: 'RQA0507H 这个结论要同步一下',
              hasRealContent: true,
              confidence: 0.74,
              ambiguities: ['capture_wording'],
              corrections: [],
              slots: {
                content: 'RQA0507H 这个结论要同步一下',
              },
            },
          ],
        })

      const result = await orchestrateWorkspaceRun({
        userId: 'user_123',
        request: {
          kind: 'input',
          text: '记一下：RQA0507H 这个结论要同步一下；再记一下：RQA0507H 这个结论要同步一下',
        },
        store: createMockStore(),
        runModel,
        searchCandidates: createMockSearchCandidates(),
      })

      expect(result.ok).toBe(true)
      expect(result.phase).toBe('review')
      expect(result.snapshot?.understandingPreview?.draftTasks.map((task) => task.target)).toEqual([
        'notes',
        'notes',
      ])
      expect(result.snapshot?.preview?.plan?.steps.map((step) => step.toolName)).toEqual([
        'create_note',
        'create_note',
      ])
    })

    it('keeps repeat capture segments separate even when semantic split marks the second segment as continuation', async () => {
      const { orchestrateWorkspaceRun } = await import('@/server/modules/workspace-agent/workspace-run-orchestrator')

      const runModel = vi
        .fn<WorkspaceRunModel>()
        .mockResolvedValueOnce({
          rawText: '记一下：RQA0507H 这个结论要同步一下；再记一下：RQA0507H 这个结论要同步一下',
          normalizedText: '记一下：RQA0507H 这个结论要同步一下；再记一下：RQA0507H 这个结论要同步一下',
          urls: [],
          separators: ['；'],
          typoCandidates: [],
          timeHints: [],
        })
        .mockResolvedValueOnce({
          isMultiTask: true,
          corrections: [],
          segments: [
            {
              id: 'segment_1',
              text: '记一下：RQA0507H 这个结论要同步一下',
              relation: 'independent',
              operationCue: 'new_capture',
              confidence: 0.96,
            },
            {
              id: 'segment_2',
              text: '再记一下：RQA0507H 这个结论要同步一下',
              relation: 'continuation',
              operationCue: 'repeat_capture',
              confidence: 0.95,
            },
          ],
        })
        .mockResolvedValueOnce({
          draftTasks: [
            {
              id: 'task_1',
              intent: 'create',
              target: 'notes',
              title: '记一下：RQA0507H 这个结论要同步一下',
              cleanTitle: 'RQA0507H 这个结论要同步一下',
              cleanContent: 'RQA0507H 这个结论要同步一下',
              captureMode: 'note_capture',
              clarifyReason: 'none',
              repeatRelation: 'independent',
              targetConfidence: 0.95,
              hasRealContent: true,
              confidence: 0.8,
              ambiguities: [],
              corrections: [],
              slotEntries: [{ key: 'content', value: 'RQA0507H 这个结论要同步一下' }],
            },
          ],
        })
        .mockResolvedValueOnce({
          draftTasks: [
            {
              id: 'task_2',
              intent: 'create',
              target: 'notes',
              title: '再记一下：RQA0507H 这个结论要同步一下',
              cleanTitle: 'RQA0507H 这个结论要同步一下',
              cleanContent: 'RQA0507H 这个结论要同步一下',
              captureMode: 'note_capture',
              clarifyReason: 'none',
              repeatRelation: 'duplicate_of_previous',
              targetConfidence: 0.95,
              hasRealContent: true,
              confidence: 0.8,
              ambiguities: [],
              corrections: [],
              slotEntries: [{ key: 'content', value: 'RQA0507H 这个结论要同步一下' }],
            },
          ],
        })

      const result = await orchestrateWorkspaceRun({
        userId: 'user_123',
        request: {
          kind: 'input',
          text: '记一下：RQA0507H 这个结论要同步一下；再记一下：RQA0507H 这个结论要同步一下',
        },
        store: createMockStore(),
        runModel,
        searchCandidates: createMockSearchCandidates(),
      })

      expect(result.ok).toBe(true)
      expect(runModel).toHaveBeenCalledTimes(4)
      if (!result.ok || result.phase !== 'review') {
        throw new Error(`Expected review result, received ${result.ok ? result.phase : 'failed'}`)
      }
      expect(result.snapshot?.understandingPreview?.draftTasks).toHaveLength(2)
      expect(result.snapshot?.understandingPreview?.draftTasks.map((task) => task.cleanTitle)).toEqual([
        'RQA0507H 这个结论要同步一下',
        'RQA0507H 这个结论要同步一下',
      ])
      expect(result.snapshot?.interaction).toMatchObject({
        type: 'confirm_duplicate',
        target: 'note',
      })
    })

    it('routes repeated note capture marked as duplicate_of_previous into duplicate confirmation', async () => {
      const { orchestrateWorkspaceRun } = await import('@/server/modules/workspace-agent/workspace-run-orchestrator')

      const runModel = vi
        .fn<WorkspaceRunModel>()
        .mockResolvedValueOnce({
          rawText: '记一下：RQA0507H 这个结论要同步一下；再记一下：RQA0507H 这个结论要同步一下',
          normalizedText: '记一下：RQA0507H 这个结论要同步一下；再记一下：RQA0507H 这个结论要同步一下',
          urls: [],
          separators: ['；'],
          typoCandidates: [],
          timeHints: [],
        })
        .mockResolvedValueOnce({
          isMultiTask: true,
          corrections: [],
          segments: [
            {
              id: 'segment_1',
              text: '记一下：RQA0507H 这个结论要同步一下',
              relation: 'independent',
              operationCue: 'new_capture',
              confidence: 0.96,
            },
            {
              id: 'segment_2',
              text: '再记一下：RQA0507H 这个结论要同步一下',
              relation: 'continuation',
              operationCue: 'repeat_capture',
              confidence: 0.95,
            },
          ],
        })
        .mockResolvedValueOnce({
          draftTasks: [
            {
              id: 'task_1',
              intent: 'create',
              target: 'notes',
              title: '记一下：RQA0507H 这个结论要同步一下',
              cleanTitle: 'RQA0507H 这个结论要同步一下',
              cleanContent: 'RQA0507H 这个结论要同步一下',
              captureMode: 'note_capture',
              clarifyReason: 'none',
              repeatRelation: 'independent',
              targetConfidence: 0.95,
              hasRealContent: true,
              confidence: 0.8,
              ambiguities: [],
              corrections: [],
              slotEntries: [{ key: 'content', value: 'RQA0507H 这个结论要同步一下' }],
            },
          ],
        })
        .mockResolvedValueOnce({
          draftTasks: [
            {
              id: 'task_2',
              intent: 'create',
              target: 'notes',
              title: '再记一下：RQA0507H 这个结论要同步一下',
              cleanTitle: 'RQA0507H 这个结论要同步一下',
              cleanContent: 'RQA0507H 这个结论要同步一下',
              captureMode: 'note_capture',
              clarifyReason: 'none',
              repeatRelation: 'duplicate_of_previous',
              targetConfidence: 0.95,
              hasRealContent: true,
              confidence: 0.8,
              ambiguities: [],
              corrections: [],
              slotEntries: [{ key: 'content', value: 'RQA0507H 这个结论要同步一下' }],
            },
          ],
        })

      const result = await orchestrateWorkspaceRun({
        userId: 'user_123',
        request: {
          kind: 'input',
          text: '记一下：RQA0507H 这个结论要同步一下；再记一下：RQA0507H 这个结论要同步一下',
        },
        store: createMockStore(),
        runModel,
        searchCandidates: createMockSearchCandidates(),
      })

      expect(result.ok).toBe(true)
      expect(result.phase).toBe('review')
      expect(result.snapshot?.interaction).toMatchObject({
        type: 'confirm_duplicate',
        target: 'note',
        current: {
          stepId: 'step_2',
          title: 'RQA0507H 这个结论要同步一下',
        },
      })
      if (result.snapshot?.interaction.type !== 'confirm_duplicate') {
        throw new Error('Expected confirm_duplicate interaction')
      }
      expect(result.snapshot.interaction.duplicates).toEqual([
        expect.objectContaining({
          id: 'draft:step_1',
          label: 'RQA0507H 这个结论要同步一下',
        }),
      ])
      expect(executorMock.executeWorkspaceRunSteps).not.toHaveBeenCalled()
    })

    it('prechecks duplicate bookmarks in multi-task inputs before generic duplicate scanning', async () => {
      const { orchestrateWorkspaceRun } = await import('@/server/modules/workspace-agent/workspace-run-orchestrator')

      duplicateCandidatesMock.findWorkspaceBookmarkDuplicateCandidates.mockResolvedValueOnce([
        {
          stepId: 'step_2',
          target: 'bookmark',
          duplicates: [
            {
              id: 'bookmark_1',
              label: 'https://example.com/rqa0506c',
              reason: 'URL already exists',
            },
          ],
        },
      ])

      const result = await orchestrateWorkspaceRun({
        userId: 'user_123',
        request: {
          kind: 'input',
          text: '记个待办：明天下午给客户发报价；把这个链接存一下，真实验收回看用：https://example.com/rqa0506c',
        },
        store: createMockStore(),
        runModel: vi
          .fn<WorkspaceRunModel>()
          .mockResolvedValueOnce({
            rawText: '记个待办：明天下午给客户发报价；把这个链接存一下，真实验收回看用：https://example.com/rqa0506c',
            normalizedText: '记个待办：明天下午给客户发报价；把这个链接存一下，真实验收回看用：https://example.com/rqa0506c',
            urls: ['https://example.com/rqa0506c'],
            separators: ['；', '，'],
            typoCandidates: [],
            timeHints: ['明天下午'],
          })
          .mockResolvedValueOnce({
            isMultiTask: true,
            corrections: [],
            segments: [
              {
                id: 'segment_1',
                text: '记个待办：明天下午给客户发报价',
                relation: 'independent',
                confidence: 0.96,
              },
              {
                id: 'segment_2',
                text: '把这个链接存一下，真实验收回看用：https://example.com/rqa0506c',
                relation: 'independent',
                confidence: 0.97,
              },
            ],
          })
          .mockResolvedValueOnce({
            draftTasks: [
              {
                id: 'task_1',
                intent: 'create',
                target: 'todos',
                title: '给客户发报价',
                hasRealContent: true,
                confidence: 0.93,
                ambiguities: [],
                corrections: [],
                slots: {
                  dueAt: '2026-05-10T13:00:00.000Z',
                  timeText: '明天下午',
                },
              },
            ],
          })
          .mockResolvedValueOnce({
            draftTasks: [
              {
                id: 'task_2',
                intent: 'create',
                target: 'bookmarks',
                title: '真实验收回看用',
                hasRealContent: true,
                confidence: 0.95,
                ambiguities: [],
                corrections: [],
                slots: {
                  url: 'https://example.com/rqa0506c',
                  note: '真实验收回看用',
                },
              },
            ],
          }),
        searchCandidates: createMockSearchCandidates(),
      })

      expect(result.ok).toBe(true)
      expect(result.phase).toBe('review')
      expect(result.snapshot?.interaction).toMatchObject({
        type: 'confirm_duplicate',
        target: 'bookmark',
      })
      expect(duplicateCandidatesMock.findWorkspaceBookmarkDuplicateCandidates).toHaveBeenCalledTimes(1)
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
      const runModel: WorkspaceRunModel = async ({ userPrompt }) => {
        if (userPrompt.includes('<raw_text>')) {
          return {
            rawText: '记个待办',
            normalizedText: '记个待办',
            urls: [],
            separators: [],
            typoCandidates: [],
            timeHints: [],
          }
        }

        if (userPrompt.includes('<normalized_input>') && !userPrompt.includes('<inherited_corrections>')) {
          return {
            isMultiTask: false,
            corrections: [],
            segments: [
              {
                id: 'segment_1',
                text: '记个待办',
                relation: 'independent',
                confidence: 0.95,
              },
            ],
          }
        }

        return {
          draftTasks: [
            {
              id: 'draft_1',
              intent: 'create',
              target: 'todos',
              title: '记个待办',
              hasRealContent: false,
              confidence: 0.82,
              ambiguities: [],
              corrections: [],
              slots: {},
            },
          ],
        }
      }

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
    it('skips compose phase for single-step auto-executed create runs', async () => {
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

      expect(events).not.toContainEqual(expect.objectContaining({ type: 'phase_started', phase: 'compose' }))
      expect(events).not.toContainEqual(expect.objectContaining({ type: 'phase_completed', phase: 'compose' }))
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
      expect(result.message).toBe('已取消这次处理。')
      expect(store.failAwaitingRuns).toHaveBeenCalledWith('user_123')
    })

    it('returns a user-facing skip message without replanning when candidate selection is skipped', async () => {
      const { orchestrateWorkspaceRun } = await import('@/server/modules/workspace-agent/workspace-run-orchestrator')

      const store = createMockStore()
      store.loadLatestAwaiting = vi.fn().mockResolvedValue({
        runId: 'run_123',
        phase: 'review',
        status: 'awaiting_user',
        interactionId: 'run_123_select_candidate',
        interaction: {
          runId: 'run_123',
          id: 'run_123_select_candidate',
          type: 'select_candidate',
          target: 'todo',
          message: '找到多个可能匹配的待办，请选择要更新的一项。',
          actions: ['select', 'skip', 'cancel'] as const,
          candidates: [
            {
              id: 'todo_1',
              label: '给客户发报价',
              type: 'todo',
              reason: '标题完全匹配',
            },
          ],
        },
        timeline: [],
        preview: null,
        understandingPreview: {
          rawInput: '把给客户发报价标记完成',
          normalizedInput: '把给客户发报价标记完成',
          draftTasks: [
            {
              id: 'draft_1',
              intent: 'update',
              target: 'todos',
              title: '把给客户发报价标记完成',
              confidence: 0.91,
              ambiguities: [],
              corrections: [],
              slots: { status: 'done' },
            },
          ],
          corrections: [],
        },
        correctionNotes: [],
        updatedAt: new Date().toISOString(),
      })

      const events: WorkspaceRunStreamEvent[] = []

      const result = await orchestrateWorkspaceRun({
        userId: 'user_123',
        request: {
          kind: 'resume',
          runId: 'run_123',
          interactionId: 'run_123_select_candidate',
          response: { type: 'select_candidate', action: 'skip' },
        },
        store,
        runModel: createMockRunModel(),
        searchCandidates: createMockSearchCandidates(),
        onEvent: (event) => events.push(event),
      })

      expect(result.ok).toBe(false)
      expect(result.phase).toBe('cancelled')
      expect(result.message).toBe('已跳过这次候选选择，没有执行更新。')
      expect(events).toContainEqual(
        expect.objectContaining({
          type: 'run_failed',
          error: expect.objectContaining({
            code: 'SKIPPED',
            message: '已跳过这次候选选择，没有执行更新。',
          }),
        })
      )
      expect(events).not.toContainEqual(expect.objectContaining({ type: 'phase_started', phase: 'plan' }))
      expect(events).not.toContainEqual(expect.objectContaining({ type: 'phase_started', phase: 'time_normalize' }))
    })

    it('auto-executes after saving clear multi-task draft edits', async () => {
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
      expect(result.phase).toBe('completed')
      expect(events).toContainEqual(
        expect.objectContaining({
          type: 'run_completed',
        })
      )
      expect(events).not.toContainEqual(
        expect.objectContaining({
          type: 'awaiting_user',
          interaction: expect.objectContaining({ type: 'edit_draft_tasks' }),
        })
      )
      expect(events).not.toContainEqual(
        expect.objectContaining({
          type: 'awaiting_user',
          interaction: expect.objectContaining({ type: 'confirm_plan' }),
        })
      )
    })

    it('applies clarified target enum to mixed create tasks before replanning', async () => {
      const { orchestrateWorkspaceRun } = await import('@/server/modules/workspace-agent/workspace-run-orchestrator')

      const store = createMockStore()
      store.loadLatestAwaiting = vi.fn().mockResolvedValue({
        runId: 'run_123',
        phase: 'review',
        status: 'awaiting_user',
        interactionId: 'run_123_clarify_mixed_target',
        interaction: {
          runId: 'run_123',
          id: 'run_123_clarify_mixed_target',
          type: 'clarify_slots',
          message: '我还不确定你是想记待办、笔记还是书签。',
          actions: ['submit', 'cancel'] as const,
          fields: [
            {
              key: 'target',
              label: '记录类型',
              required: true,
              input: 'select',
              options: [
                { value: 'todos', label: '待办' },
                { value: 'notes', label: '笔记' },
                { value: 'bookmarks', label: '书签' },
              ],
            },
            { key: 'details', label: '具体内容', required: true },
          ],
        },
        timeline: [],
        preview: null,
        understandingPreview: {
          rawInput: '下周那个你帮我整理一下',
          normalizedInput: '下周那个你帮我整理一下',
          draftTasks: [
            {
              id: 'draft_1',
              intent: 'create',
              target: 'mixed',
              title: '下周那个你帮我整理一下',
              confidence: 0.65,
              ambiguities: ['不确定记录类型和具体内容'],
              corrections: [],
              slots: {},
            },
          ],
          corrections: [],
        },
        correctionNotes: [],
        updatedAt: '2026-05-06T00:00:00.000Z',
      })

      const result = await orchestrateWorkspaceRun({
        userId: 'user_123',
        request: {
          kind: 'resume',
          runId: 'run_123',
          interactionId: 'run_123_clarify_mixed_target',
          response: {
            type: 'clarify_slots',
            action: 'submit',
            values: {
              target: 'todos',
              details: '下周整理 QA20260506G',
            },
          },
        },
        store,
        runModel: createMockRunModel(),
        searchCandidates: createMockSearchCandidates(),
      })

      expect(result.ok).toBe(true)
      expect(result.phase).toBe('completed')
      expect(executorMock.executeWorkspaceRunSteps).toHaveBeenCalled()
      expect(executorMock.executeWorkspaceRunSteps.mock.calls[0]?.[0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            action: 'create_todo',
            target: 'todos',
            toolInput: expect.objectContaining({
              title: '下周整理 QA20260506G',
            }),
          }),
        ])
      )
    })

    it('advances to the next duplicate confirmation after skipping the current duplicate step', async () => {
      const { orchestrateWorkspaceRun } = await import('@/server/modules/workspace-agent/workspace-run-orchestrator')

      const store = createMockStore()
      duplicateCandidatesMock.findWorkspaceRunDuplicateCandidates.mockResolvedValueOnce([
        {
          stepId: 'step_1',
          target: 'todo',
          duplicates: [
            { id: 'todo_1', label: '给客户发报价', reason: '标题和时间完全一致' },
          ],
        },
        {
          stepId: 'step_2',
          target: 'bookmark',
          duplicates: [
            { id: 'bookmark_1', label: 'OpenAI', reason: 'URL 完全一致' },
          ],
        },
      ])
      const draftTasks: DraftWorkspaceTask[] = [
        {
          id: 'task_1',
          intent: 'create',
          target: 'todos',
          title: '给客户发报价',
          confidence: 0.95,
          ambiguities: [],
          corrections: [],
          slots: { title: '给客户发报价', timeText: '明天下午' },
        },
        {
          id: 'task_2',
          intent: 'create',
          target: 'bookmarks',
          title: 'OpenAI',
          confidence: 0.93,
          ambiguities: [],
          corrections: [],
          slots: { url: 'https://openai.com' },
        },
      ]

      store.loadLatestAwaiting = vi.fn().mockResolvedValue({
        runId: 'run_123',
        phase: 'review',
        status: 'awaiting_user',
        interactionId: 'run_123_confirm_duplicate_step_1',
        interaction: {
          runId: 'run_123',
          id: 'run_123_confirm_duplicate_step_1',
          type: 'confirm_duplicate',
          target: 'todo',
          message: '发现可能重复的待办。',
          actions: ['create', 'skip', 'cancel'] as const,
          current: {
            stepId: 'step_1',
            title: '给客户发报价',
            preview: '创建待办：给客户发报价',
          },
          duplicates: [
            { id: 'todo_1', label: '给客户发报价', reason: '标题和时间完全一致' },
          ],
        },
        timeline: [],
        preview: null,
        understandingPreview: {
          rawInput: '明天下午给客户发报价，并收藏 https://openai.com',
          normalizedInput: '明天下午给客户发报价，并收藏 https://openai.com',
          draftTasks,
          corrections: [],
        },
        correctionNotes: [],
        duplicateReview: {
          draftTasksConfirmed: true,
          decisions: [],
        },
        updatedAt: new Date().toISOString(),
      })

      const events: unknown[] = []

      const result = await orchestrateWorkspaceRun({
        userId: 'user_123',
        request: {
          kind: 'resume',
          runId: 'run_123',
          interactionId: 'run_123_confirm_duplicate_step_1',
          response: { type: 'confirm_duplicate', action: 'skip' },
        },
        store,
        runModel: createMockRunModel(),
        searchCandidates: createMockSearchCandidates(),
        onEvent: (event) => events.push(event),
      })

      expect(result.ok).toBe(true)
      expect(result.phase).toBe('review')
      expect(events).toContainEqual(
        expect.objectContaining({
          type: 'awaiting_user',
          interaction: expect.objectContaining({
            type: 'confirm_duplicate',
            current: expect.objectContaining({ stepId: 'step_2' }),
          }),
        })
      )
    })

    it('re-runs time normalization on confirm_plan when snapshot tasks still contain raw todo time', async () => {
      const { orchestrateWorkspaceRun } = await import('@/server/modules/workspace-agent/workspace-run-orchestrator')

      const store = createMockStore()
      store.loadLatestAwaiting = vi.fn().mockResolvedValue({
        runId: 'run_123',
        phase: 'review',
        status: 'awaiting_user',
        interactionId: 'run_123_confirm_plan',
        interaction: {
          runId: 'run_123',
          id: 'run_123_confirm_plan',
          type: 'confirm_plan',
          message: '请确认执行计划。',
          actions: ['confirm', 'edit', 'cancel'] as const,
          plan: {
            summary: '准备执行 1 个任务。',
            steps: [
              {
                id: 'step_1',
                toolName: 'create_todo',
                title: '发周报',
                preview: '创建待办：发周报',
              },
            ],
          },
        },
        timeline: [],
        preview: null,
        understandingPreview: {
          rawInput: '明天下午3点发周报',
          normalizedInput: '明天下午3点发周报',
          draftTasks: [
            {
              id: 'draft_1',
              intent: 'create',
              target: 'todos',
              title: '发周报',
              confidence: 0.92,
              ambiguities: [],
              corrections: [],
              slots: {
                title: '发周报',
                time: '明天下午3点',
              },
            },
          ],
          corrections: [],
        },
        correctionNotes: [],
        updatedAt: '2026-05-06T00:00:00.000Z',
      })

      const events: WorkspaceRunStreamEvent[] = []

      const result = await orchestrateWorkspaceRun({
        userId: 'user_123',
        request: {
          kind: 'resume',
          runId: 'run_123',
          interactionId: 'run_123_confirm_plan',
          response: {
            type: 'confirm_plan',
            action: 'confirm',
          },
        },
        store,
        runModel: createMockRunModel(),
        searchCandidates: createMockSearchCandidates(),
        onEvent: (event) => events.push(event),
      })

      expect(result.ok).toBe(true)
      expect(result.phase).toBe('completed')
      expect(events).toContainEqual(expect.objectContaining({ type: 'phase_started', phase: 'time_normalize' }))
      expect(executorMock.executeWorkspaceRunSteps).toHaveBeenCalled()
      expect(executorMock.executeWorkspaceRunSteps.mock.calls[0]?.[0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            action: 'create_todo',
            toolInput: expect.objectContaining({
              dueAt: expect.any(String),
            }),
          }),
        ])
      )
    })

    it('completes without executing when all duplicate create steps are skipped', async () => {
      const { orchestrateWorkspaceRun } = await import('@/server/modules/workspace-agent/workspace-run-orchestrator')

      const store = createMockStore()
      duplicateCandidatesMock.findWorkspaceRunDuplicateCandidates.mockResolvedValueOnce([
        {
          stepId: 'step_1',
          target: 'todo',
          duplicates: [
            { id: 'todo_1', label: '给客户发报价', reason: '标题和时间完全一致' },
          ],
        },
      ])
      const draftTasks: DraftWorkspaceTask[] = [
        {
          id: 'task_1',
          intent: 'create',
          target: 'todos',
          title: '给客户发报价',
          confidence: 0.95,
          ambiguities: [],
          corrections: [],
          slots: { title: '给客户发报价', timeText: '明天下午' },
        },
      ]

      store.loadLatestAwaiting = vi.fn().mockResolvedValue({
        runId: 'run_123',
        phase: 'review',
        status: 'awaiting_user',
        interactionId: 'run_123_confirm_duplicate_step_1',
        interaction: {
          runId: 'run_123',
          id: 'run_123_confirm_duplicate_step_1',
          type: 'confirm_duplicate',
          target: 'todo',
          message: '发现可能重复的待办。',
          actions: ['create', 'skip', 'cancel'] as const,
          current: {
            stepId: 'step_1',
            title: '给客户发报价',
            preview: '创建待办：给客户发报价',
          },
          duplicates: [
            { id: 'todo_1', label: '给客户发报价', reason: '标题和时间完全一致' },
          ],
        },
        timeline: [],
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
        understandingPreview: {
          rawInput: '明天下午给客户发报价',
          normalizedInput: '明天下午给客户发报价',
          draftTasks,
          corrections: [],
        },
        correctionNotes: [],
        duplicateReview: {
          draftTasksConfirmed: false,
          decisions: [],
        },
        updatedAt: new Date().toISOString(),
      })

      const result = await orchestrateWorkspaceRun({
        userId: 'user_123',
        request: {
          kind: 'resume',
          runId: 'run_123',
          interactionId: 'run_123_confirm_duplicate_step_1',
          response: { type: 'confirm_duplicate', action: 'skip' },
        },
        store,
        runModel: createMockRunModel(),
        searchCandidates: createMockSearchCandidates(),
      })

      expect(result.ok).toBe(true)
      expect(result.phase).toBe('completed')
      expect(result.result?.summary).toContain('跳过')
      expect(result.result?.preview?.plan?.steps ?? []).toEqual([])
    })

    it('executes remaining low-risk steps directly after skipping duplicates in confirmed multi-task flow', async () => {
      const { orchestrateWorkspaceRun } = await import('@/server/modules/workspace-agent/workspace-run-orchestrator')

      const store = createMockStore()
      duplicateCandidatesMock.findWorkspaceRunDuplicateCandidates.mockResolvedValueOnce([
        {
          stepId: 'step_1',
          target: 'todo',
          duplicates: [
            { id: 'todo_1', label: '给客户发报价', reason: '标题和时间完全一致' },
          ],
        },
      ])

      const draftTasks: DraftWorkspaceTask[] = [
        {
          id: 'task_1',
          intent: 'create',
          target: 'todos',
          title: '给客户发报价',
          confidence: 0.95,
          ambiguities: [],
          corrections: [],
          slots: { title: '给客户发报价', timeText: '明天下午' },
        },
        {
          id: 'task_2',
          intent: 'create',
          target: 'bookmarks',
          title: 'OpenAI',
          confidence: 0.95,
          ambiguities: [],
          corrections: [],
          slots: { url: 'https://openai.com' },
        },
      ]

      store.loadLatestAwaiting = vi.fn().mockResolvedValue({
        runId: 'run_123',
        phase: 'review',
        status: 'awaiting_user',
        interactionId: 'run_123_confirm_duplicate_step_1',
        interaction: {
          runId: 'run_123',
          id: 'run_123_confirm_duplicate_step_1',
          type: 'confirm_duplicate',
          target: 'todo',
          message: '发现可能重复的待办。',
          actions: ['create', 'skip', 'cancel'] as const,
          current: {
            stepId: 'step_1',
            title: '给客户发报价',
            preview: '创建待办：给客户发报价',
          },
          duplicates: [
            { id: 'todo_1', label: '给客户发报价', reason: '标题和时间完全一致' },
          ],
        },
        timeline: [],
        preview: null,
        understandingPreview: {
          rawInput: '明天下午给客户发报价，并收藏 https://openai.com',
          normalizedInput: '明天下午给客户发报价，并收藏 https://openai.com',
          draftTasks,
          corrections: [],
        },
        correctionNotes: [],
        duplicateReview: {
          draftTasksConfirmed: true,
          decisions: [],
        },
        updatedAt: new Date().toISOString(),
      })

      const result = await orchestrateWorkspaceRun({
        userId: 'user_123',
        request: {
          kind: 'resume',
          runId: 'run_123',
          interactionId: 'run_123_confirm_duplicate_step_1',
          response: { type: 'confirm_duplicate', action: 'skip' },
        },
        store,
        runModel: createMockRunModel(),
        searchCandidates: createMockSearchCandidates(),
      })

      expect(result.phase).not.toBe('review')
      expect(['completed', 'execute']).toContain(result.phase)
      expect(store.saveSnapshot).not.toHaveBeenCalled()
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
      expect(result.phase).not.toBe('review')
    })

    it('advances past clarify_slots when user submits details on resume', async () => {
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
          message: '请补充任务信息',
          actions: ['submit', 'cancel'],
          fields: [
            {
              key: 'details',
              label: '请补充任务信息',
              required: true,
              placeholder: '告诉我你想更新或创建什么',
            },
          ],
        },
        timeline: [],
        preview: null,
        understandingPreview: {
          rawInput: '记个待办',
          normalizedInput: '记个待办',
          draftTasks: [
            {
              id: 'draft_1',
              intent: 'create',
              target: 'todos',
              title: '',
              confidence: 0.82,
              ambiguities: [],
              corrections: [],
              slots: {},
            },
          ],
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
          interactionId: 'run_123_clarify',
          response: {
            type: 'clarify_slots',
            action: 'submit',
            values: {
              details: '明天下午两点提醒我给财务回电话',
            },
          },
        },
        store,
        runModel: createMockRunModel(),
        searchCandidates: createMockSearchCandidates(),
        onEvent: (e) => events.push(e),
      })

      expect(result.ok).toBe(true)
      if (result.phase === 'review' && result.snapshot) {
        expect(result.snapshot.interaction.type).not.toBe('clarify_slots')
      }
    })

    it('advances past clarify_slots when user submits details for notes on resume', async () => {
      const { orchestrateWorkspaceRun } = await import('@/server/modules/workspace-agent/workspace-run-orchestrator')

      const store = createMockStore()

      store.loadLatestAwaiting = vi.fn().mockResolvedValue({
        runId: 'run_456',
        phase: 'review',
        status: 'awaiting_user',
        interactionId: 'run_456_clarify',
        interaction: {
          runId: 'run_456',
          id: 'run_456_clarify',
          type: 'clarify_slots',
          message: '请补充任务信息',
          actions: ['submit', 'cancel'],
          fields: [
            {
              key: 'details',
              label: '请补充任务信息',
              required: true,
              placeholder: '告诉我你想更新或创建什么',
            },
          ],
        },
        timeline: [],
        preview: null,
        understandingPreview: {
          rawInput: '记个笔记',
          normalizedInput: '记个笔记',
          draftTasks: [
            {
              id: 'draft_1',
              intent: 'create',
              target: 'notes',
              title: '',
              confidence: 0.82,
              ambiguities: [],
              corrections: [],
              slots: {},
            },
          ],
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
          runId: 'run_456',
          interactionId: 'run_456_clarify',
          response: {
            type: 'clarify_slots',
            action: 'submit',
            values: {
              details: '客户今天更关心案例页的说服力',
            },
          },
        },
        store,
        runModel: createMockRunModel(),
        searchCandidates: createMockSearchCandidates(),
        onEvent: (e) => events.push(e),
      })

      expect(result.ok).toBe(true)
      if (result.phase === 'review' && result.snapshot) {
        expect(result.snapshot.interaction.type).not.toBe('clarify_slots')
      }
    })

    it('does not re-clarify a mixed task after target enum and details are submitted', async () => {
      const { orchestrateWorkspaceRun } = await import('@/server/modules/workspace-agent/workspace-run-orchestrator')

      const store = createMockStore()

      store.loadLatestAwaiting = vi.fn().mockResolvedValue({
        runId: 'run_789',
        phase: 'review',
        status: 'awaiting_user',
        interactionId: 'run_789_clarify_mixed_target',
        interaction: {
          runId: 'run_789',
          id: 'run_789_clarify_mixed_target',
          type: 'clarify_slots',
          message: '我还不确定你是想记待办、笔记还是书签。',
          actions: ['submit', 'cancel'],
          fields: [
            {
              key: 'target',
              label: '记录类型',
              required: true,
              input: 'select',
              options: [
                { value: 'todos', label: '待办' },
                { value: 'notes', label: '笔记' },
                { value: 'bookmarks', label: '书签' },
              ],
            },
            {
              key: 'details',
              label: '具体内容',
              required: true,
            },
          ],
        },
        timeline: [],
        preview: null,
        understandingPreview: {
          rawInput: '下周那个你帮我整理一下',
          normalizedInput: '下周那个你帮我整理一下',
          draftTasks: [
            {
              id: 'draft_1',
              intent: 'create',
              target: 'mixed',
              title: '下周那个你帮我整理一下',
              confidence: 0.65,
              ambiguities: ['需要你再补充一些信息'],
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
          runId: 'run_789',
          interactionId: 'run_789_clarify_mixed_target',
          response: {
            type: 'clarify_slots',
            action: 'submit',
            values: {
              target: 'todos',
              details: '2026年5月12日上午整理第5轮验收问题清单 RQA0507R5G',
            },
          },
        },
        store,
        runModel: createMockRunModel(),
        searchCandidates: createMockSearchCandidates(),
      })

      expect(result.ok).toBe(true)
      expect(result.phase).toBe('completed')
      if (!result.ok || result.phase !== 'completed') {
        throw new Error('Expected completed result after clarification submit')
      }
      expect(executorMock.executeWorkspaceRunSteps).toHaveBeenCalled()
    })

    it('returns phaseTimings when resume stays in review after duplicate skip', async () => {
      const { orchestrateWorkspaceRun } = await import('@/server/modules/workspace-agent/workspace-run-orchestrator')

      const store = createMockStore()
      duplicateCandidatesMock.findWorkspaceRunDuplicateCandidates.mockResolvedValueOnce([
        {
          stepId: 'step_1',
          target: 'todo',
          duplicates: [
            { id: 'todo_1', label: '给客户发报价', reason: '标题和时间完全一致' },
          ],
        },
        {
          stepId: 'step_2',
          target: 'bookmark',
          duplicates: [
            { id: 'bookmark_1', label: 'OpenAI', reason: 'URL 完全一致' },
          ],
        },
      ])

      const draftTasks: DraftWorkspaceTask[] = [
        {
          id: 'task_1',
          intent: 'create',
          target: 'todos',
          title: '给客户发报价',
          confidence: 0.95,
          ambiguities: [],
          corrections: [],
          slots: { title: '给客户发报价', timeText: '明天下午' },
        },
        {
          id: 'task_2',
          intent: 'create',
          target: 'bookmarks',
          title: 'OpenAI',
          confidence: 0.93,
          ambiguities: [],
          corrections: [],
          slots: { url: 'https://openai.com' },
        },
      ]

      store.loadLatestAwaiting = vi.fn().mockResolvedValue({
        runId: 'run_123',
        phase: 'review',
        status: 'awaiting_user',
        interactionId: 'run_123_confirm_duplicate_step_1',
        interaction: {
          runId: 'run_123',
          id: 'run_123_confirm_duplicate_step_1',
          type: 'confirm_duplicate',
          target: 'todo',
          message: '发现可能重复的待办。',
          actions: ['create', 'skip', 'cancel'] as const,
          current: {
            stepId: 'step_1',
            title: '给客户发报价',
            preview: '创建待办：给客户发报价',
          },
          duplicates: [
            { id: 'todo_1', label: '给客户发报价', reason: '标题和时间完全一致' },
          ],
        },
        timeline: [],
        preview: null,
        understandingPreview: {
          rawInput: '明天下午给客户发报价，并收藏 https://openai.com',
          normalizedInput: '明天下午给客户发报价，并收藏 https://openai.com',
          draftTasks,
          corrections: [],
        },
        correctionNotes: [],
        duplicateReview: {
          draftTasksConfirmed: true,
          decisions: [],
        },
        updatedAt: new Date().toISOString(),
      })

      const result = await orchestrateWorkspaceRun({
        userId: 'user_123',
        request: {
          kind: 'resume',
          runId: 'run_123',
          interactionId: 'run_123_confirm_duplicate_step_1',
          response: { type: 'confirm_duplicate', action: 'skip' },
        },
        store,
        runModel: createMockRunModel(),
        searchCandidates: createMockSearchCandidates(),
      })

      expect(result.ok).toBe(true)
      expect(result.phase).toBe('review')
      expect(result.phaseTimings).toBeDefined()
      expect(result.phaseTimings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            phase: 'review',
            kind: 'orchestration',
          }),
        ])
      )
      expect(result.phaseTimings).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            phase: 'time_normalize',
          }),
        ])
      )
    })

    it('returns phaseTimings when resume completes execution', async () => {
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
      })

      expect(result.ok).toBe(true)
      expect(result.phase).toBe('completed')
      expect(result.phaseTimings).toBeDefined()
      expect(result.phaseTimings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            phase: 'review',
            kind: 'orchestration',
          }),
          expect.objectContaining({
            phase: 'execute',
            kind: 'tool',
          }),
          expect.objectContaining({
            phase: 'compose',
          }),
        ])
      )
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
      const ambiguousModel: WorkspaceRunModel = async ({ userPrompt }) => {
        if (userPrompt.includes('<raw_text>')) {
          return {
            rawText: '记个待办：尽快处理报销',
            normalizedText: '记个待办：尽快处理报销',
            urls: [],
            separators: ['：'],
            typoCandidates: [],
            timeHints: [],
          }
        }

        if (userPrompt.includes('<normalized_input>') && !userPrompt.includes('<inherited_corrections>')) {
          return {
            isMultiTask: false,
            corrections: [],
            segments: [
              {
                id: 'segment_1',
                text: '记个待办：尽快处理报销',
                relation: 'independent',
                confidence: 0.95,
              },
            ],
          }
        }

        return {
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
        }
      }

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

  describe('phase timings', () => {
    it('includes phaseTimings with non-negative duration in completed run', async () => {
      const { orchestrateWorkspaceRun } = await import('@/server/modules/workspace-agent/workspace-run-orchestrator')

      const result = await orchestrateWorkspaceRun({
        userId: 'user_123',
        request: { kind: 'input', text: '给客户发报价' },
        store: createMockStore(),
        runModel: createMockRunModel(),
        searchCandidates: createMockSearchCandidates(),
      })

      expect(result.phaseTimings).toBeDefined()
      expect(result.phaseTimings!.length).toBeGreaterThanOrEqual(5)
      for (const timing of result.phaseTimings!) {
        expect(timing.durationMs).toBeGreaterThanOrEqual(0)
        expect(timing.startTs).toBeGreaterThan(0)
        expect(timing.endTs).toBeGreaterThanOrEqual(timing.startTs)
        expect(['model', 'tool', 'orchestration']).toContain(timing.kind)
      }
    })

    it('records phase timings in correct sequential order', async () => {
      const { orchestrateWorkspaceRun } = await import('@/server/modules/workspace-agent/workspace-run-orchestrator')

      const result = await orchestrateWorkspaceRun({
        userId: 'user_123',
        request: { kind: 'input', text: '给客户发报价' },
        store: createMockStore(),
        runModel: createMockRunModel(),
        searchCandidates: createMockSearchCandidates(),
      })

      const timings = result.phaseTimings!
      for (let i = 1; i < timings.length; i++) {
        expect(timings[i].startTs).toBeGreaterThanOrEqual(timings[i - 1].startTs)
      }
    })

    it('includes phaseTimings when run awaits user clarification', async () => {
      const { orchestrateWorkspaceRun } = await import('@/server/modules/workspace-agent/workspace-run-orchestrator')

      const ambiguousRunModel: WorkspaceRunModel = async ({ userPrompt }) => {
        if (userPrompt.includes('<raw_text>')) {
          return {
            rawText: '记一下这个',
            normalizedText: '记一下这个',
            urls: [],
            separators: [],
            typoCandidates: [],
            timeHints: [],
          }
        }

        if (userPrompt.includes('<normalized_input>') && !userPrompt.includes('<inherited_corrections>')) {
          return {
            isMultiTask: false,
            corrections: [],
            segments: [
              {
                id: 'segment_1',
                text: '记一下这个',
                relation: 'independent',
                confidence: 0.95,
              },
            ],
          }
        }

        return {
          draftTasks: [
            {
              id: 'draft_1',
              intent: 'create',
              target: 'mixed',
              title: '',
              confidence: 0.35,
              ambiguities: [],
              corrections: [],
              slots: {},
            },
          ],
        }
      }

      const result = await orchestrateWorkspaceRun({
        userId: 'user_123',
        request: { kind: 'input', text: '帮我整理一下' },
        store: createMockStore(),
        runModel: ambiguousRunModel,
        searchCandidates: createMockSearchCandidates(),
      })

      expect(result.phaseTimings).toBeDefined()
      expect(result.phaseTimings!.length).toBeGreaterThanOrEqual(3)
      for (const timing of result.phaseTimings!) {
        expect(timing.durationMs).toBeGreaterThanOrEqual(0)
      }
    })

    it('captures ts field on phase stream events', async () => {
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

      const phaseEvents = events.filter(
        (e): e is { ts: number; phase: string } => typeof e === 'object' && e !== null && 'ts' in e && 'phase' in e
      )
      expect(phaseEvents.length).toBeGreaterThanOrEqual(10)
      for (const event of phaseEvents) {
        expect((event as { ts: number }).ts).toBeGreaterThan(0)
      }
    })
  })
})
