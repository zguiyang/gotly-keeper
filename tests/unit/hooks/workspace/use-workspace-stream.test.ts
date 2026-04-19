// @vitest-environment jsdom

import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { UIMessage } from 'ai'

import { useWorkspaceStream } from '@/hooks/workspace/use-workspace-stream'
import type {
  WorkspaceRunRequest,
  WorkspaceRunResult,
  WorkspaceRunStage,
} from '@/shared/workspace/workspace-run.types'

type WorkspaceMessage = UIMessage<{ stage?: WorkspaceRunStage }>

const chatMock = vi.hoisted(() => ({
  implementation: null as null | ((helpers: {
    message: {
      text?: string
      metadata?: WorkspaceRunRequest
    }
    setMessages: React.Dispatch<React.SetStateAction<WorkspaceMessage[]>>
    setStatus: React.Dispatch<React.SetStateAction<'ready' | 'submitted' | 'streaming' | 'error'>>
    setError: React.Dispatch<React.SetStateAction<Error | undefined>>
  }) => Promise<void>),
}))

vi.mock('@ai-sdk/react', () => ({
  useChat: () => {
    const [messages, setMessages] = React.useState<WorkspaceMessage[]>([])
    const [status, setStatus] = React.useState<'ready' | 'submitted' | 'streaming' | 'error'>('ready')
    const [error, setError] = React.useState<Error | undefined>(undefined)

    const sendMessage = React.useCallback(
      async (message: { text?: string; metadata?: WorkspaceRunRequest }) => {
        if (!chatMock.implementation) {
          throw new Error('chat mock implementation missing')
        }

        await chatMock.implementation({ message, setMessages, setStatus, setError })
      },
      [setMessages, setStatus, setError]
    )

    return {
      messages,
      sendMessage,
      status,
      error,
      clearError: () => setError(undefined),
    }
  },
}))

function createAssistantMessage(options: {
  stage?: WorkspaceRunStage
  text?: string
  result?: WorkspaceRunResult
}): WorkspaceMessage {
  return {
    id: Math.random().toString(36).slice(2),
    role: 'assistant',
    metadata: options.stage ? { stage: options.stage } : undefined,
    parts: [
      ...(options.text ? [{ type: 'text' as const, text: options.text, state: 'done' as const }] : []),
      ...(options.result
        ? [
            {
              type: 'tool-search_assets' as const,
              toolCallId: 'tool-call-1',
              state: 'output-available' as const,
              input: { query: 'query' },
              output: options.result,
            },
          ]
        : []),
    ],
  }
}

function createQueryResult(): WorkspaceRunResult {
  return {
    kind: 'query',
    query: '帮我找上周收藏的文章',
    queryDescription: '书签 · 上周',
    results: [
      {
        id: 'asset_1',
        originalText: '文章摘录',
        title: '上周收藏文章',
        excerpt: '这是一篇上周收藏的文章',
        type: 'link',
        url: 'https://example.com/post',
        timeText: null,
        dueAt: null,
        completed: false,
        createdAt: new Date('2026-04-18T10:00:00.000Z'),
      },
    ],
  }
}

function createTodoReviewResult(): WorkspaceRunResult {
  return {
    kind: 'todo-review',
    review: {
      headline: '待办复盘',
      summary: '最近待办集中在发布准备。',
      nextActions: ['确认发布时间'],
      sourceAssetIds: ['todo_1'],
      sources: [{ id: 'todo_1', title: '发布上线', timeText: null, dueAt: null }],
      generatedAt: new Date('2026-04-18T10:00:00.000Z'),
    },
  }
}

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void

  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })

  return { promise, resolve, reject }
}

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
    chatMock.implementation = null
    ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
      true
  })

  afterEach(() => {
    activeHook?.unmount()
    activeHook = null
  })

  it('maps structuring stage into launcher state and final query result', async () => {
    const deferred = createDeferred<void>()

    chatMock.implementation = async ({ message, setMessages, setStatus, setError }) => {
      expect(message.metadata).toEqual({ kind: 'input', text: '帮我找上周收藏的文章' })

      setError(undefined)
      setStatus('streaming')
      setMessages([createAssistantMessage({ stage: 'structuring', text: '正在结构化理解请求' })])

      await deferred.promise

      setStatus('ready')
      setMessages([createAssistantMessage({ result: createQueryResult() })])
    }

    const hook = renderHook(() => useWorkspaceStream())
    activeHook = hook

    let submission!: Promise<void>
    act(() => {
      submission = hook.result.current.submitInput('帮我找上周收藏的文章')
    })

    expect(hook.result.current.state.status).toBe('streaming')
    expect(hook.result.current.state.stage).toBe('structuring')
    expect(hook.result.current.state.stageMessage).toBe('正在结构化理解请求')

    deferred.resolve()

    await act(async () => {
      await submission
    })

    expect(hook.result.current.state.status).toBe('success')
    expect(hook.result.current.state.stage).toBe(null)
    expect(hook.result.current.state.stageMessage).toBe(null)
    expect(hook.result.current.state.result?.kind).toBe('query')
  })

  it('routes quick actions through the same stream hook', async () => {
    chatMock.implementation = async ({ message, setMessages, setStatus }) => {
      expect(message.metadata).toEqual({ kind: 'quick-action', action: 'review-todos' })

      setStatus('ready')
      setMessages([createAssistantMessage({ result: createTodoReviewResult() })])
    }

    const hook = renderHook(() => useWorkspaceStream())
    activeHook = hook

    await act(async () => {
      await hook.result.current.triggerQuickAction('review-todos')
    })

    expect(hook.result.current.state.status).toBe('success')
    expect(hook.result.current.state.result?.kind).toBe('todo-review')
  })

  it('clears previous result as soon as a new request is submitted', async () => {
    const secondRequestDeferred = createDeferred<void>()

    chatMock.implementation = async ({ message, setMessages, setStatus, setError }) => {
      setError(undefined)

      if (message.metadata?.kind === 'input' && message.metadata.text === '先查一次') {
        setStatus('ready')
        setMessages([createAssistantMessage({ result: createQueryResult() })])
        return
      }

      setStatus('submitted')
      await secondRequestDeferred.promise
    }

    const hook = renderHook(() => useWorkspaceStream())
    activeHook = hook

    await act(async () => {
      await hook.result.current.submitInput('先查一次')
    })

    expect(hook.result.current.state.status).toBe('success')
    expect(hook.result.current.state.result?.kind).toBe('query')

    let secondSubmission!: Promise<void>
    act(() => {
      secondSubmission = hook.result.current.submitInput('再来一次新请求')
    })

    expect(hook.result.current.state.status).toBe('streaming')
    expect(hook.result.current.state.stage).toBe('understanding')
    expect(hook.result.current.state.result).toBe(null)

    secondRequestDeferred.resolve()

    await act(async () => {
      await secondSubmission
    })
  })

  it('maps transport errors into launcher error state', async () => {
    chatMock.implementation = async ({ setError, setStatus }) => {
      const error = new Error('网络异常')
      setError(error)
      setStatus('error')
      throw error
    }

    const hook = renderHook(() => useWorkspaceStream())
    activeHook = hook

    let submission!: Promise<void>
    act(() => {
      submission = hook.result.current.submitInput('记一条新笔记')
    })

    await expect(submission).rejects.toThrow('网络异常')

    await act(async () => {
      try {
        await submission
      } catch {
        return
      }
    })

    expect(hook.result.current.state.status).toBe('error')
    expect(hook.result.current.state.errorMessage).toBe('网络异常')
  })
})
