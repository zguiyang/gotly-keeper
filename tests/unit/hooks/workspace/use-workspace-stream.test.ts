// @vitest-environment jsdom

import { waitFor } from '@testing-library/react'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useWorkspaceStream } from '@/hooks/workspace/use-workspace-stream'

import type { WorkspaceRunStreamEvent } from '@/shared/workspace/workspace-run-protocol'

vi.mock('@/client/workspace/workspace-run-events.client', () => ({
  streamWorkspaceRunEvents: vi.fn(),
  fetchCurrentWorkspaceRun: vi.fn(),
}))

function renderHook<T>(useHook: () => T) {
  const container = document.createElement('div')
  const root = createRoot(container)
  let current!: T

  function TestComponent() {
    const value = useHook()

    React.useEffect(() => {
      current = value
    }, [value])

    return null
  }

  act(() => {
    root.render(React.createElement(TestComponent))
  })

  return {
    result: {
      get current() {
        return current
      },
    },
    unmount() {
      act(() => {
        root.unmount()
      })
    },
  }
}

describe('useWorkspaceStream', () => {
  let activeHook: ReturnType<typeof renderHook<ReturnType<typeof useWorkspaceStream>>> | null = null

  let mockStreamWorkspaceRunEvents: ReturnType<typeof vi.fn>
  let mockFetchCurrentWorkspaceRun: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    vi.restoreAllMocks()
    ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
      true

    const client = await import('@/client/workspace/workspace-run-events.client')
    mockStreamWorkspaceRunEvents = client.streamWorkspaceRunEvents as ReturnType<typeof vi.fn>
    mockFetchCurrentWorkspaceRun = client.fetchCurrentWorkspaceRun as ReturnType<typeof vi.fn>
  })

  afterEach(() => {
    activeHook?.unmount()
    activeHook = null
  })

  it('rehydrates the latest awaiting run on page initialization', async () => {
    mockFetchCurrentWorkspaceRun.mockResolvedValueOnce({
      ok: true,
      run: {
        runId: 'run_awaiting',
        interaction: {
          id: 'interaction_1',
          runId: 'run_awaiting',
          type: 'select_candidate',
          target: 'todo',
          message: '请选择要更新的待办',
          actions: ['select', 'skip', 'cancel'] as const,
          candidates: [
            { id: 'todo_1', label: '发报价给老王', reason: '报价相关' },
          ],
        },
        timeline: [
          { type: 'phase_completed', phase: 'preview', output: {} },
        ],
        understandingPreview: null,
        planPreview: null,
        correctionNotes: [],
        updatedAt: '2026-04-27T01:00:00.000Z',
      },
    })

    const hook = renderHook(() => useWorkspaceStream())
    activeHook = hook

    await waitFor(() => {
      expect(hook.result.current.state.status).toBe('awaiting_user')
    })
    expect(hook.result.current.state.runId).toBe('run_awaiting')
    expect(hook.result.current.state.interaction?.type).toBe('select_candidate')
  })

  it('stores awaiting user interaction and resumes it', async () => {
    const events: WorkspaceRunStreamEvent[] = [
      { type: 'phase_started', phase: 'normalize' },
      { type: 'phase_completed', phase: 'normalize' },
      { type: 'phase_started', phase: 'understand' },
      { type: 'phase_completed', phase: 'understand' },
      {
        type: 'awaiting_user',
        interaction: {
          id: 'interaction_1',
          runId: 'run_1',
          type: 'select_candidate',
          target: 'todo',
          message: '请选择要更新的待办',
          actions: ['select', 'skip', 'cancel'] as const,
          candidates: [
            { id: 'todo_1', label: '发报价给老王', reason: '报价相关' },
          ],
        },
      },
    ]

    mockStreamWorkspaceRunEvents.mockImplementation(async (_request, handlers) => {
      for (const event of events) {
        handlers.onEvent(event)
      }
    })

    const hook = renderHook(() => useWorkspaceStream())
    activeHook = hook

    await act(async () => {
      await hook.result.current.submitInput('把那个报价的事改到后天下午吧')
    })

    expect(hook.result.current.state.status).toBe('awaiting_user')
    expect(hook.result.current.state.interaction?.type).toBe('select_candidate')
    expect(hook.result.current.state.runId).toBe('run_1')

    mockStreamWorkspaceRunEvents.mockImplementation(async (_request, handlers) => {
      handlers.onEvent({
        type: 'run_completed',
        result: { summary: '已更新', preview: null },
      })
    })

    await act(async () => {
      await hook.result.current.resumeInteraction({
        type: 'select_candidate',
        action: 'select',
        candidateId: 'todo_1',
      })
    })

    expect(hook.result.current.state.status).toBe('success')
  })

  it('emits phase_started and phase_completed events', async () => {
    const events: WorkspaceRunStreamEvent[] = [
      { type: 'phase_started', phase: 'normalize' },
      { type: 'phase_completed', phase: 'normalize' },
      { type: 'phase_started', phase: 'understand' },
      { type: 'phase_completed', phase: 'understand' },
      { type: 'phase_started', phase: 'plan' },
      { type: 'phase_completed', phase: 'plan' },
      { type: 'phase_started', phase: 'preview' },
      { type: 'phase_completed', phase: 'preview' },
      {
        type: 'run_completed',
        result: { summary: '已找到 1 条笔记', preview: null },
      },
    ]

    mockStreamWorkspaceRunEvents.mockImplementation(async (_request, handlers) => {
      for (const event of events) {
        handlers.onEvent(event)
      }
    })

    const hook = renderHook(() => useWorkspaceStream())
    activeHook = hook

    await act(async () => {
      await hook.result.current.submitInput('找下最近笔记')
    })

    expect(hook.result.current.state.status).toBe('success')
    expect(hook.result.current.state.timeline).toEqual(events)
  })

  it('handles tool_call_started and tool_call_completed events', async () => {
    const events: WorkspaceRunStreamEvent[] = [
      { type: 'phase_started', phase: 'execute' },
      { type: 'tool_call_started', toolName: 'create_todo', preview: '创建待办：发报价' },
      { type: 'tool_call_completed', toolName: 'create_todo', result: { ok: true } },
      { type: 'phase_completed', phase: 'execute' },
      { type: 'phase_started', phase: 'compose' },
      { type: 'phase_completed', phase: 'compose' },
      {
        type: 'run_completed',
        result: { summary: '已创建待办', preview: null },
      },
    ]

    mockStreamWorkspaceRunEvents.mockImplementation(async (_request, handlers) => {
      for (const event of events) {
        handlers.onEvent(event)
      }
    })

    const hook = renderHook(() => useWorkspaceStream())
    activeHook = hook

    await act(async () => {
      await hook.result.current.submitInput('记个待办：发报价')
    })

    expect(hook.result.current.state.status).toBe('success')
    const toolEvents = hook.result.current.state.timeline.filter(
      (e) => e.type === 'tool_call_started' || e.type === 'tool_call_completed'
    )
    expect(toolEvents).toHaveLength(2)
  })

  it('handles run_failed events', async () => {
    const events: WorkspaceRunStreamEvent[] = [
      { type: 'phase_started', phase: 'execute' },
      { type: 'tool_call_started', toolName: 'create_todo', preview: '创建待办' },
      {
        type: 'run_failed',
        error: { code: 'tool_failed', message: '工具执行失败' },
      },
    ]

    mockStreamWorkspaceRunEvents.mockImplementation(async (_request, handlers) => {
      for (const event of events) {
        handlers.onEvent(event)
      }
    })

    const hook = renderHook(() => useWorkspaceStream())
    activeHook = hook

    await act(async () => {
      await hook.result.current.submitInput('记个待办：发报价')
    })

    expect(hook.result.current.state.status).toBe('error')
    expect(hook.result.current.state.errorMessage).toBe('工具执行失败')
  })

  it('aborts the previous request before starting a new one', async () => {
    mockStreamWorkspaceRunEvents.mockClear()

    mockStreamWorkspaceRunEvents.mockImplementation(async (_request, handlers) => {
      const events: WorkspaceRunStreamEvent[] = [
        { type: 'phase_started', phase: 'normalize' },
        {
          type: 'run_completed',
          result: { summary: '请求完成', preview: null },
        },
      ]
      for (const event of events) {
        handlers.onEvent(event)
      }
    })

    const hook = renderHook(() => useWorkspaceStream())
    activeHook = hook

    hook.result.current.submitInput('第一次请求')

    await act(async () => {
      await hook.result.current.submitInput('第二次请求')
    })

    expect(mockStreamWorkspaceRunEvents).toHaveBeenCalledTimes(2)
    expect(hook.result.current.state.status).toBe('success')
    expect(hook.result.current.state.runId).toBeUndefined()
  })
})
