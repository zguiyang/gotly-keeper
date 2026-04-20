import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  QUICK_ACTION_PROMPTS,
  resolveWorkspaceAgentPrompt,
  streamWorkspaceAgentRun,
} from '@/server/modules/workspace-agent/workspace-agent-stream'

const createWorkspaceAgentMock = vi.hoisted(() => vi.fn())
const createAgentUIStreamMock = vi.hoisted(() => vi.fn())
const createUIMessageStreamMock = vi.hoisted(() => vi.fn())
const createUIMessageStreamResponseMock = vi.hoisted(() => vi.fn())

vi.mock('@/server/modules/workspace-agent/workspace-agent', () => ({
  createWorkspaceAgent: createWorkspaceAgentMock,
}))

vi.mock('ai', () => ({
  createAgentUIStream: createAgentUIStreamMock,
  createUIMessageStream: createUIMessageStreamMock,
  createUIMessageStreamResponse: createUIMessageStreamResponseMock,
}))

describe('workspace-agent-stream', () => {
  beforeEach(() => {
    createWorkspaceAgentMock.mockReset()
    createAgentUIStreamMock.mockReset()
    createUIMessageStreamMock.mockReset()
    createUIMessageStreamResponseMock.mockReset()
  })

  it('resolves quick action prompt', () => {
    expect(resolveWorkspaceAgentPrompt({ kind: 'quick-action', action: 'review-todos' })).toBe(
      QUICK_ACTION_PROMPTS['review-todos']
    )
  })

  it('returns 503 when agent unavailable', async () => {
    createWorkspaceAgentMock.mockResolvedValue(null)

    const response = await streamWorkspaceAgentRun({
      userId: 'user_1',
      request: { kind: 'input', text: '帮我总结今天的笔记' },
    })

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toEqual({ error: 'AI 服务暂不可用，请稍后重试。' })
  })

  it('creates merged ui stream response with bootstrap trace', async () => {
    const fakeAgent = { id: 'agent_1' }
    const fakeAgentStream = {} as ReadableStream
    const fakeResponse = new Response('stream')

    createWorkspaceAgentMock.mockResolvedValue(fakeAgent)
    createAgentUIStreamMock.mockResolvedValue(fakeAgentStream)

    createUIMessageStreamMock.mockImplementation(({ execute }) => {
      const writes: unknown[] = []
      const merges: unknown[] = []
      void execute({
        writer: {
          write: (part: unknown) => writes.push(part),
          merge: (stream: unknown) => merges.push(stream),
        },
      })
      return { writes, merges } as unknown as ReadableStream
    })

    createUIMessageStreamResponseMock.mockReturnValue(fakeResponse)

    const response = await streamWorkspaceAgentRun({
      userId: 'user_1',
      request: { kind: 'input', text: '帮我记一下发布清单' },
    })

    expect(response).toBe(fakeResponse)
    expect(createAgentUIStreamMock).toHaveBeenCalledTimes(1)
    expect(createAgentUIStreamMock).toHaveBeenCalledWith(
      expect.objectContaining({
        agent: fakeAgent,
        uiMessages: [
          expect.objectContaining({
            role: 'user',
            parts: [{ type: 'text', text: '帮我记一下发布清单' }],
          }),
        ],
      })
    )
    expect(createUIMessageStreamResponseMock).toHaveBeenCalledTimes(1)
  })
})
