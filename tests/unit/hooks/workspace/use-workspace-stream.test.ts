// @vitest-environment jsdom

import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useWorkspaceStream } from '@/hooks/workspace/use-workspace-stream'

import type {
  WorkspaceAgentToolOutput,
  WorkspaceRunRequest,
  WorkspaceRunResult,
} from '@/shared/workspace/workspace-run.types'
import type { UIMessage } from 'ai'

type WorkspaceMessage = UIMessage<WorkspaceRunRequest>

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
  useChat: (options?: {
    onFinish?: (event: {
      message: WorkspaceMessage
      messages: WorkspaceMessage[]
      isAbort: boolean
      isDisconnect: boolean
      isError: boolean
    }) => void
  }) => {
    const [messages, setMessages] = React.useState<WorkspaceMessage[]>([])
    const [status, setStatus] = React.useState<'ready' | 'submitted' | 'streaming' | 'error'>('ready')
    const [error, setError] = React.useState<Error | undefined>(undefined)

    const sendMessage = React.useCallback(
      async (message: { text?: string; metadata?: WorkspaceRunRequest }) => {
        if (!chatMock.implementation) {
          throw new Error('chat mock implementation missing')
        }

        let latestMessages = messages
        const setMessagesAndCapture: React.Dispatch<React.SetStateAction<WorkspaceMessage[]>> = (nextMessages) => {
          if (typeof nextMessages === 'function') {
            setMessages((currentMessages) => {
              latestMessages = nextMessages(currentMessages)
              return latestMessages
            })
            return
          }

          latestMessages = nextMessages
          setMessages(nextMessages)
        }

        await chatMock.implementation({
          message,
          setMessages: setMessagesAndCapture,
          setStatus,
          setError,
        })

        const assistantMessage =
          [...latestMessages].reverse().find((entry) => entry.role === 'assistant') ?? null

        if (assistantMessage) {
          options?.onFinish?.({
            message: assistantMessage,
            messages: latestMessages,
            isAbort: false,
            isDisconnect: false,
            isError: false,
          })
        }
      },
      [messages, options, setMessages, setStatus, setError]
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
  text?: string
  result?: WorkspaceRunResult
  trace?: WorkspaceAgentToolOutput['trace']
}): WorkspaceMessage {
  return {
    id: Math.random().toString(36).slice(2),
    role: 'assistant',
    parts: [
      ...(options.text ? [{ type: 'text' as const, text: options.text, state: 'done' as const }] : []),
      ...(options.result
        ? [
            {
              type: 'tool-search_assets' as const,
              toolCallId: 'tool-call-1',
              state: 'output-available' as const,
              input: { query: 'query' },
              output: {
                result: options.result,
                trace: options.trace ?? [],
              },
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
    timeFilter: {
      kind: 'exact_range',
      phrase: '上周',
      startIso: '2026-04-06T00:00:00.000Z',
      endIso: '2026-04-13T00:00:00.000Z',
      basis: '上周 = 上一个自然周',
    },
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
      sources: [
        {
          id: 'todo_1',
          originalText: '发布上线',
          title: '发布上线',
          excerpt: '确认发布时间',
          type: 'todo',
          url: null,
          timeText: null,
          dueAt: null,
          completed: false,
          createdAt: new Date('2026-04-18T10:00:00.000Z'),
        },
      ],
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
    // eslint-disable-next-line react-hooks/globals -- This local test harness exposes the latest hook value to assertions.
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
      setMessages([createAssistantMessage({ text: '正在结构化理解请求' })])

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
    expect(hook.result.current.state.assistantText).toBe('正在结构化理解请求')

    deferred.resolve()

    await act(async () => {
      await submission
    })

    expect(hook.result.current.state.status).toBe('success')
    expect(hook.result.current.state.assistantText).toBe(null)
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

  it('notifies callers when a final tool result is available', async () => {
    const onResult = vi.fn()

    chatMock.implementation = async ({ setMessages, setStatus }) => {
      setStatus('ready')
      setMessages([createAssistantMessage({ result: createQueryResult() })])
    }

    const hook = renderHook(() => useWorkspaceStream({ onResult }))
    activeHook = hook

    await act(async () => {
      await hook.result.current.submitInput('找一下书签')
    })

    expect(onResult).toHaveBeenCalledTimes(1)
    expect(onResult).toHaveBeenCalledWith(expect.objectContaining({ kind: 'query' }))
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
    expect(hook.result.current.state.assistantText).toBe(null)
    expect(hook.result.current.state.result).toBe(null)

    secondRequestDeferred.resolve()

    await act(async () => {
      await secondSubmission
    })
  })

  it('extracts assistant text, trace events, and tool result', async () => {
    chatMock.implementation = async ({ setMessages, setStatus }) => {
      setStatus('ready')
      setMessages([
        {
          id: 'assistant-msg',
          role: 'assistant',
          parts: [
            { type: 'text', text: '我找到了 2 条相关书签。', state: 'done' },
            {
              type: 'data-workspace-trace',
              data: {
                type: 'tool_executed',
                title: '执行工具',
                toolName: 'search_workspace',
                publicArgs: { query: '收藏的文章', timeFilterKind: 'vague' },
                resultSummary: '找到 2 条结果',
              },
            },
            {
              type: 'tool-search_workspace',
              state: 'output-available',
              output: {
                result: {
                  kind: 'query',
                  query: '收藏的文章',
                  queryDescription: '书签',
                  results: [],
                  timeFilter: {
                    kind: 'vague',
                    phrase: '最近',
                    reason: '最近没有固定数学边界',
                  },
                },
                trace: [],
              },
            },
          ],
        } as WorkspaceMessage,
      ])
    }

    const hook = renderHook(() => useWorkspaceStream())
    activeHook = hook

    await act(async () => {
      await hook.result.current.submitInput('帮我找最近收藏的文章')
    })

    expect(hook.result.current.state.assistantText).toBe('我找到了 2 条相关书签。')
    expect(hook.result.current.state.traceEvents).toHaveLength(1)
    expect(hook.result.current.state.result?.kind).toBe('query')
  })

  it('maps tool output errors into launcher error state', async () => {
    chatMock.implementation = async ({ setMessages, setStatus }) => {
      setStatus('ready')
      setMessages([
        {
          id: 'assistant-msg',
          role: 'assistant',
          parts: [
            {
              type: 'data-workspace-trace',
              data: {
                type: 'finalized',
                title: '整理结果',
                summary: '已接收请求，正在调用智能体。',
              },
            },
            {
              type: 'tool-create_workspace_asset',
              state: 'output-error',
              errorText: 'Invalid input for tool create_workspace_asset',
            },
          ],
        } as WorkspaceMessage,
      ])
    }

    const hook = renderHook(() => useWorkspaceStream())
    activeHook = hook

    await act(async () => {
      await hook.result.current.submitInput('记一下：首页文案方向')
    })

    expect(hook.result.current.state.status).toBe('error')
    expect(hook.result.current.state.traceEvents).toHaveLength(1)
    expect(hook.result.current.state.errorMessage).toBe('AI 工具调用参数不完整，请换个说法重试。')
  })

  it('maps non-parameter tool errors into generic launcher error state', async () => {
    chatMock.implementation = async ({ setMessages, setStatus }) => {
      setStatus('ready')
      setMessages([
        {
          id: 'assistant-msg',
          role: 'assistant',
          parts: [
            {
              type: 'tool-search_workspace',
              state: 'output-error',
              errorText: 'Tool execution timed out',
            },
          ],
        } as WorkspaceMessage,
      ])
    }

    const hook = renderHook(() => useWorkspaceStream())
    activeHook = hook

    await act(async () => {
      await hook.result.current.submitInput('找一下我的笔记')
    })

    expect(hook.result.current.state.status).toBe('error')
    expect(hook.result.current.state.errorMessage).toBe('AI 工具执行失败，请稍后重试。')
  })

  it('prefers successful result when tool error and result both exist', async () => {
    chatMock.implementation = async ({ setMessages, setStatus }) => {
      setStatus('ready')
      setMessages([
        {
          id: 'assistant-msg',
          role: 'assistant',
          parts: [
            {
              type: 'tool-create_workspace_asset',
              state: 'output-error',
              errorText: 'Invalid input for tool create_workspace_asset',
            },
            {
              type: 'tool-search_workspace',
              state: 'output-available',
              output: {
                result: createQueryResult(),
                trace: [],
              },
            },
          ],
        } as WorkspaceMessage,
      ])
    }

    const hook = renderHook(() => useWorkspaceStream())
    activeHook = hook

    await act(async () => {
      await hook.result.current.submitInput('帮我找上周收藏的文章')
    })

    expect(hook.result.current.state.status).toBe('success')
    expect(hook.result.current.state.result?.kind).toBe('query')
    expect(hook.result.current.state.errorMessage).toBe(null)
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
