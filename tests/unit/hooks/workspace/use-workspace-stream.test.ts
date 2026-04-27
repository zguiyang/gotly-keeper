// @vitest-environment jsdom

import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useWorkspaceStream } from '@/hooks/workspace/use-workspace-stream'

import type { AssetListItem } from '@/shared/assets/assets.types'
import type { WorkspaceRunStreamEvent } from '@/shared/workspace/workspace-runner.types'

function createAsset(overrides: Partial<AssetListItem>): AssetListItem {
  return {
    id: 'asset_1',
    originalText: '测试内容',
    title: '测试标题',
    excerpt: '测试摘要',
    type: 'note',
    content: null,
    note: null,
    summary: null,
    url: null,
    timeText: null,
    dueAt: null,
    completed: false,
    createdAt: new Date('2026-04-23T00:00:00.000Z'),
    ...overrides,
  }
}

function createSseResponse(events: WorkspaceRunStreamEvent[]) {
  const body = events
    .map((event) => `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`)
    .join('')

  return new Response(body, {
    status: 200,
    headers: {
      'content-type': 'text/event-stream',
    },
  })
}

function serializeForStream<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

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
      createSseResponse([
        {
          type: 'phase',
          phase: { phase: 'parse', status: 'done', message: '已理解请求' },
        },
        {
          type: 'phase',
          phase: { phase: 'route', status: 'active', message: '正在选择操作' },
        },
        {
          type: 'result',
          response: {
            ok: true,
            phases: [
              { phase: 'parse', status: 'done', message: '已理解请求' },
              { phase: 'route', status: 'done', message: '已选择 search_notes' },
            ],
            answer: '已找到 1 条笔记。',
            data: {
              kind: 'query',
              target: 'notes',
              items: [createAsset({ id: 'note_1', type: 'note' })],
              total: 1,
            },
          },
        },
      ])
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
      items: [serializeForStream(createAsset({ id: 'note_1', type: 'note' }))],
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
      createSseResponse([
        {
          type: 'result',
          response: {
            ok: true,
            phases: [],
            answer: '已创建待办。',
            data: {
              kind: 'mutation',
              action: 'create',
              target: 'todos',
              item: createAsset({ id: 'todo_1', type: 'todo' }),
            },
          },
        },
      ])
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
      item: serializeForStream(createAsset({ id: 'todo_1', type: 'todo' })),
    })
  })

  it('aborts the previous request before starting a new one', async () => {
    const abortSignals: AbortSignal[] = []
    let resolveFirstResponse: ((value: Response) => void) | null = null
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((_, init) => {
      abortSignals.push((init as RequestInit).signal as AbortSignal)

      if (abortSignals.length === 1) {
        return new Promise<Response>((resolve) => {
          resolveFirstResponse = resolve
        })
      }

      return Promise.resolve(
        createSseResponse([
          {
            type: 'result',
            response: {
              ok: true,
              phases: [],
              answer: '第二次请求成功',
              data: {
                kind: 'query',
                target: 'notes',
                items: [createAsset({ id: 'note_2', type: 'note' })],
                total: 1,
              },
            },
          },
        ])
      )
    })

    const hook = renderHook(() => useWorkspaceStream())
    activeHook = hook

    const firstRequest = hook.result.current.submitInput('第一次请求')

    await act(async () => {
      await hook.result.current.submitInput('第二次请求')
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(abortSignals[0]?.aborted).toBe(true)
    expect(hook.result.current.state.assistantText).toBe('第二次请求成功')

    await act(async () => {
      resolveFirstResponse?.(
        createSseResponse([
          {
            type: 'result',
            response: {
              ok: true,
              phases: [],
              answer: '第一次请求成功',
              data: {
                kind: 'query',
                target: 'notes',
                items: [createAsset({ id: 'note_1', type: 'note' })],
                total: 1,
              },
            },
          },
        ])
      )
      await firstRequest.catch(() => undefined)
    })

    expect(hook.result.current.state.assistantText).toBe('第二次请求成功')
  })
})
