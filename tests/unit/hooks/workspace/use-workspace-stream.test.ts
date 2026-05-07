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
  dismissCurrentWorkspaceRun: vi.fn(),
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

  it('rehydrates the latest awaiting run into pendingRun on initialization', async () => {
    mockFetchCurrentWorkspaceRun.mockResolvedValueOnce({
      ok: true,
      run: {
        runId: 'run_awaiting',
        interactionId: 'interaction_1',
        phase: 'review',
        status: 'awaiting_user',
        interaction: {
          id: 'interaction_1',
          runId: 'run_awaiting',
          type: 'select_candidate',
          target: 'todo',
          message: '请选择要更新的待办',
          actions: ['select', 'skip', 'cancel'] as const,
          candidates: [{ id: 'todo_1', label: '发报价给老王', reason: '报价相关' }],
        },
        timeline: [{ type: 'phase_started', phase: 'review' }],
        preview: null,
        understandingPreview: null,
        correctionNotes: [],
        updatedAt: new Date().toISOString(),
      },
    })

    const hook = renderHook(() => useWorkspaceStream())
    activeHook = hook

    await waitFor(() => {
      expect(hook.result.current.pendingRun?.runId).toBe('run_awaiting')
    })
    expect(hook.result.current.state.status).toBe('idle')
  })

  it('stores awaiting user interaction after submit', async () => {
    const events: WorkspaceRunStreamEvent[] = [
      { type: 'phase_started', phase: 'normalize' },
      { type: 'phase_completed', phase: 'normalize' },
      {
        type: 'awaiting_user',
        interaction: {
          id: 'interaction_1',
          runId: 'run_1',
          type: 'select_candidate',
          target: 'todo',
          message: '请选择要更新的待办',
          actions: ['select', 'skip', 'cancel'] as const,
          candidates: [{ id: 'todo_1', label: '发报价给老王', reason: '报价相关' }],
        },
      },
    ]

    mockFetchCurrentWorkspaceRun.mockResolvedValueOnce({ ok: true, run: null })
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
  })

  it('resumes a stored interaction to success', async () => {
    mockFetchCurrentWorkspaceRun.mockResolvedValueOnce({ ok: true, run: null })
    mockStreamWorkspaceRunEvents
      .mockImplementationOnce(async (_request, handlers) => {
        handlers.onEvent({
          type: 'awaiting_user',
          interaction: {
            id: 'interaction_1',
            runId: 'run_1',
            type: 'select_candidate',
            target: 'todo',
            message: '请选择要更新的待办',
            actions: ['select', 'skip', 'cancel'] as const,
            candidates: [{ id: 'todo_1', label: '发报价给老王', reason: '报价相关' }],
          },
        })
      })
      .mockImplementationOnce(async (_request, handlers) => {
        handlers.onEvent({
          type: 'run_completed',
          result: { summary: '已更新', preview: null },
        })
      })

    const hook = renderHook(() => useWorkspaceStream())
    activeHook = hook

    await act(async () => {
      await hook.result.current.submitInput('把报价改到后天下午')
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
})
