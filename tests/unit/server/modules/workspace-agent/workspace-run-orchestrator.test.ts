import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ReviewableDuplicateCandidate } from '@/server/modules/workspace-agent/workspace-run-duplicates'
import type { SearchWorkspaceRunCandidates } from '@/server/modules/workspace-agent/workspace-run-planner'
import type { WorkspaceRunStore } from '@/server/modules/workspace-agent/workspace-run-store'
import type { WorkspaceRunModel } from '@/server/modules/workspace-agent/workspace-run-understanding'
import type { WorkspacePendingRunSnapshot } from '@/shared/workspace/workspace-run-protocol'

const duplicateCandidatesMock = vi.hoisted(() => ({
  findWorkspaceCreateDuplicateCandidate: vi.fn<() => Promise<ReviewableDuplicateCandidate | null>>(async () => null),
  findWorkspaceCreateDuplicateCandidates: vi.fn<() => Promise<ReviewableDuplicateCandidate[]>>(async () => []),
}))

vi.mock('@/server/modules/workspace-agent/workspace-run-duplicates', () => ({
  findWorkspaceCreateDuplicateCandidate: duplicateCandidatesMock.findWorkspaceCreateDuplicateCandidate,
  findWorkspaceCreateDuplicateCandidates: duplicateCandidatesMock.findWorkspaceCreateDuplicateCandidates,
}))

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

function createMockStore(overrides: Partial<WorkspaceRunStore> = {}): WorkspaceRunStore {
  return {
    saveSnapshot: vi.fn().mockResolvedValue(undefined),
    loadLatestAwaiting: vi.fn().mockResolvedValue(null),
    failAwaitingRuns: vi.fn().mockResolvedValue(0),
    updateRunStatus: vi.fn().mockResolvedValue(true),
    deleteRun: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

function createMockSearchCandidates(): SearchWorkspaceRunCandidates {
  return async () => []
}

function createRunModel(outputs: unknown[]): WorkspaceRunModel {
  const queue = [...outputs]
  return vi.fn<WorkspaceRunModel>().mockImplementation(async () => queue.shift())
}

describe('workspace-run-orchestrator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    duplicateCandidatesMock.findWorkspaceCreateDuplicateCandidate.mockResolvedValue(null)
    duplicateCandidatesMock.findWorkspaceCreateDuplicateCandidates.mockResolvedValue([])
  })

  it('auto-executes a clear single todo create request', async () => {
    const { orchestrateWorkspaceRun } = await import('@/server/modules/workspace-agent/workspace-run-orchestrator')
    const runModel = createRunModel([
      {
        draftTasks: [
          {
            id: 'task_1',
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
    ])

    const result = await orchestrateWorkspaceRun({
      userId: 'user_123',
      request: { kind: 'input', text: '记个待办：给客户发报价' },
      store: createMockStore(),
      runModel,
      searchCandidates: createMockSearchCandidates(),
    })

    expect(result.ok).toBe(true)
    expect(runModel).toHaveBeenCalledTimes(1)
    expect(executorMock.executeWorkspaceRunSteps).toHaveBeenCalled()
  })

  it('stores an awaiting snapshot for multi-task input and uses confirm_plan', async () => {
    const { orchestrateWorkspaceRun } = await import('@/server/modules/workspace-agent/workspace-run-orchestrator')
    const store = createMockStore()
    const runModel = createRunModel([
      {
        isMultiTask: true,
        corrections: [],
        segments: [
          { id: 'segment_1', text: '记个待办：发报价', relation: 'independent', confidence: 0.96 },
          { id: 'segment_2', text: '再记一下：一句话直接保存', relation: 'independent', confidence: 0.94 },
        ],
      },
      {
        draftTasks: [
          {
            id: 'task_1',
            intent: 'create',
            target: 'todos',
            title: '发报价',
            confidence: 0.92,
            ambiguities: [],
            corrections: [],
            slots: { title: '发报价' },
          },
        ],
      },
      {
        draftTasks: [
          {
            id: 'task_2',
            intent: 'create',
            target: 'notes',
            title: '一句话直接保存',
            confidence: 0.91,
            ambiguities: [],
            corrections: [],
            slots: { content: '一句话直接保存' },
          },
        ],
      },
    ])

    const result = await orchestrateWorkspaceRun({
      userId: 'user_123',
      request: { kind: 'input', text: '记个待办：发报价；再记一下：一句话直接保存' },
      store,
      runModel,
      searchCandidates: createMockSearchCandidates(),
    })

    expect(result.ok).toBe(true)
    expect(runModel).toHaveBeenCalledTimes(3)
    expect(result.snapshot?.interaction.type).toBe('confirm_plan')
    expect(store.saveSnapshot).toHaveBeenCalled()
  })

  it('stores duplicate confirmation for bookmark precheck hits', async () => {
    const { orchestrateWorkspaceRun } = await import('@/server/modules/workspace-agent/workspace-run-orchestrator')
    const store = createMockStore()
    const runModel = createRunModel([
      {
        draftTasks: [
          {
            id: 'task_1',
            intent: 'create',
            target: 'bookmarks',
            title: 'OpenAI',
            confidence: 0.93,
            ambiguities: [],
            corrections: [],
            slots: { url: 'https://openai.com' },
          },
        ],
      },
    ])

    duplicateCandidatesMock.findWorkspaceCreateDuplicateCandidate.mockResolvedValue({
      stepId: 'step_1',
      target: 'bookmark',
      source: 'precheck',
      duplicates: [{ id: 'bookmark_1', label: 'OpenAI', type: 'bookmark' }],
    })

    const result = await orchestrateWorkspaceRun({
      userId: 'user_123',
      request: { kind: 'input', text: '存书签：https://openai.com' },
      store,
      runModel,
      searchCandidates: createMockSearchCandidates(),
    })

    expect(result.ok).toBe(true)
    expect(runModel).toHaveBeenCalledTimes(1)
    expect(result.snapshot?.interaction.type).toBe('confirm_duplicate')
    expect(store.saveSnapshot).toHaveBeenCalled()
  })

  it('auto-executes a simple retrieval request with one understanding call', async () => {
    const { orchestrateWorkspaceRun } = await import('@/server/modules/workspace-agent/workspace-run-orchestrator')
    const runModel = createRunModel([
      {
        draftTasks: [
          {
            id: 'task_1',
            intent: 'query',
            target: 'bookmarks',
            title: '刚刚那篇讲 RSC 边界的书签',
            confidence: 0.91,
            ambiguities: [],
            corrections: [],
            slotEntries: [
              { key: 'query', value: 'RSC 边界' },
              { key: 'timeRange', value: 'recent' },
            ],
          },
        ],
      },
    ])

    const result = await orchestrateWorkspaceRun({
      userId: 'user_123',
      request: { kind: 'input', text: '帮我找一下刚刚那篇讲 RSC 边界的书签' },
      store: createMockStore(),
      runModel,
      searchCandidates: createMockSearchCandidates(),
    })

    expect(result.ok).toBe(true)
    expect(runModel).toHaveBeenCalledTimes(1)
    expect(executorMock.executeWorkspaceRunSteps).toHaveBeenCalled()
  })

  it('resumes candidate selection into execution', async () => {
    const { orchestrateWorkspaceRun } = await import('@/server/modules/workspace-agent/workspace-run-orchestrator')

    const pendingRun: WorkspacePendingRunSnapshot = {
      runId: 'run_1',
      interactionId: 'run_1_select_candidate',
      phase: 'review',
      status: 'awaiting_user',
      interaction: {
        runId: 'run_1',
        id: 'run_1_select_candidate',
        type: 'select_candidate',
        target: 'todo',
        message: '请选择要更新的待办',
        actions: ['select', 'skip', 'cancel'],
        candidates: [{ id: 'todo_1', label: '给客户发报价' }],
      },
      timeline: [{ type: 'phase_started', phase: 'review' }],
      preview: null,
      understandingPreview: {
        rawInput: '把报价标记完成',
        normalizedInput: '把报价标记完成',
        draftTasks: [
          {
            id: 'draft_1',
            intent: 'update',
            target: 'todos',
            title: '把报价标记完成',
            confidence: 0.86,
            ambiguities: [],
            corrections: [],
            slots: { query: '报价', status: 'done' },
          },
        ],
        corrections: [],
      },
      correctionNotes: [],
      updatedAt: '2026-04-27T12:00:00.000Z',
    }

    const store = createMockStore({
      loadLatestAwaiting: vi.fn().mockResolvedValue(pendingRun),
    })

    const result = await orchestrateWorkspaceRun({
      userId: 'user_123',
      request: {
        kind: 'resume',
        runId: 'run_1',
        interactionId: 'run_1_select_candidate',
        response: {
          type: 'select_candidate',
          action: 'select',
          candidateId: 'todo_1',
        },
      },
      store,
      runModel: createRunModel([]),
      searchCandidates: async () => [{ id: 'todo_1', type: 'todo', title: '给客户发报价', confidence: 0.9, matchReason: '匹配' }],
    })

    expect(result.ok).toBe(true)
    expect(executorMock.executeWorkspaceRunSteps).toHaveBeenCalled()
  })

  it('resumes a read clarification into execution once the query is provided', async () => {
    const { handleResume } = await import('@/server/modules/workspace-agent/workspace-run-orchestrator.resume')

    const pendingRun: WorkspacePendingRunSnapshot = {
      runId: 'run_1',
      interactionId: 'run_1_clarify_slots',
      phase: 'review',
      status: 'awaiting_user',
      interaction: {
        runId: 'run_1',
        id: 'run_1_clarify_slots',
        type: 'clarify_slots',
        message: '我知道你想查找内容，但还缺更具体的关键词。',
        actions: ['submit', 'cancel'],
        fields: [
          {
            key: 'query',
            label: '查询关键词',
            required: true,
            input: 'text',
            placeholder: '例如：RQA0507R5A',
          },
        ],
      },
      timeline: [{ type: 'phase_started', phase: 'review' }],
      preview: null,
      understandingPreview: {
        rawInput: '帮我找一下刚刚那条验收结论',
        normalizedInput: '帮我找一下刚刚那条验收结论',
        draftTasks: [
          {
            id: 'draft_1',
            intent: 'query',
            target: 'mixed',
            title: '帮我找一下刚刚那条验收结论',
            cleanTitle: '帮我找一下刚刚那条验收结论',
            clarifyReason: 'none',
            confidence: 0.86,
            ambiguities: [],
            corrections: [],
            slots: {},
          },
        ],
        corrections: [],
      },
      correctionNotes: [],
      updatedAt: '2026-05-07T12:00:00.000Z',
    }

    const store = createMockStore({
      loadLatestAwaiting: vi.fn().mockResolvedValue(pendingRun),
    })

    const result = await handleResume({
      userId: 'user_123',
      request: {
        kind: 'resume',
        runId: 'run_1',
        interactionId: 'run_1_clarify_slots',
        response: {
          type: 'clarify_slots',
          action: 'submit',
          values: {
            query: 'RQA0507R5A',
          },
        },
      },
      store,
      runModel: createRunModel([]),
      searchCandidates: createMockSearchCandidates(),
    })

    expect(result.ok).toBe(true)
    expect(result.phase).toBe('completed')
    expect(executorMock.executeWorkspaceRunSteps).toHaveBeenCalled()
    expect(store.saveSnapshot).not.toHaveBeenCalled()
  })
})
