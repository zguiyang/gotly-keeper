// @vitest-environment jsdom

import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useWorkspaceStream } from '@/hooks/workspace/use-workspace-stream'

function renderHook<T>(useHook: () => T) {
  const container = document.createElement('div')
  const root = createRoot(container)
  let current!: T

  function TestComponent() {
    current = useHook()
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

  beforeEach(() => {
    vi.restoreAllMocks()
    ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
      true
  })

  afterEach(() => {
    activeHook?.unmount()
    activeHook = null
  })

  it('submits input requests and stores successful query results', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          phases: [
            { phase: 'parse', status: 'done', message: '已理解请求' },
            { phase: 'route', status: 'done', message: '已选择 search_notes' },
          ],
          answer: '已找到 1 条笔记。',
          data: {
            kind: 'query',
            target: 'notes',
            items: [{ id: 'note_1', type: 'note' }],
            total: 1,
          },
        }),
        { status: 200 }
      )
    )

    const hook = renderHook(() => useWorkspaceStream())
    activeHook = hook

    await act(async () => {
      await hook.result.current.submitInput('找下最近笔记')
    })

    expect(fetchMock).toHaveBeenCalledWith('/api/workspace/run', expect.objectContaining({
      method: 'POST',
    }))
    expect(hook.result.current.state.status).toBe('success')
    expect(hook.result.current.state.assistantText).toBe('已找到 1 条笔记。')
    expect(hook.result.current.state.result).toEqual({
      kind: 'query',
      target: 'notes',
      items: [{ id: 'note_1', type: 'note' }],
      total: 1,
    })
  })

  it('surfaces API errors as error state', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: '请输入有效内容。' }), { status: 400 })
    )

    const hook = renderHook(() => useWorkspaceStream())
    activeHook = hook

    await act(async () => {
      await hook.result.current.submitInput('')
    })

    expect(hook.result.current.state.status).toBe('error')
    expect(hook.result.current.state.errorMessage).toBe('请输入有效内容。')
  })

  it('passes successful responses to onResult', async () => {
    const onResult = vi.fn()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          phases: [],
          answer: '已创建待办。',
          data: {
            kind: 'mutation',
            action: 'create',
            target: 'todos',
            item: { id: 'todo_1', type: 'todo' },
          },
        }),
        { status: 200 }
      )
    )

    const hook = renderHook(() => useWorkspaceStream({ onResult }))
    activeHook = hook

    await act(async () => {
      await hook.result.current.submitInput('创建一个待办')
    })

    expect(onResult).toHaveBeenCalledWith({
      kind: 'mutation',
      action: 'create',
      target: 'todos',
      item: { id: 'todo_1', type: 'todo' },
    })
  })
})
