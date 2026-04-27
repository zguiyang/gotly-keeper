import { beforeEach, describe, expect, it, vi } from 'vitest'

import { POST } from '@/app/api/workspace/run/route'

const requireWorkspaceUserAccessMock = vi.hoisted(() => vi.fn())
const runWorkspaceMock = vi.hoisted(() => vi.fn())

vi.mock('@/server/modules/auth/workspace-session', () => ({
  requireWorkspaceUserAccess: requireWorkspaceUserAccessMock,
}))

vi.mock('@/server/modules/workspace-agent/workspace-runner', () => ({
  runWorkspace: runWorkspaceMock,
}))

async function readSseEvents(response: Response) {
  const text = await response.text()
  return text
    .trim()
    .split('\n\n')
    .filter(Boolean)
    .map((frame) => {
      const dataLine = frame
        .split('\n')
        .find((line) => line.startsWith('data: '))

      if (!dataLine) {
        throw new Error(`Missing SSE data line: ${frame}`)
      }

      return JSON.parse(dataLine.slice(6)) as unknown
    })
}

describe('/api/workspace/run POST', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireWorkspaceUserAccessMock.mockResolvedValue({ id: 'user_123' })
    runWorkspaceMock.mockResolvedValue({
      ok: true,
      phase: 'completed',
      task: {
        intent: 'query',
        target: 'notes',
      },
      plan: {
        intent: 'query',
        target: 'notes',
        toolName: 'search_notes',
        toolInput: {},
        needsCompose: false,
      },
      data: {
        ok: true,
        target: 'notes',
        items: [],
        total: 0,
      },
      answer: '已找到 0 条笔记。',
    })
  })

  it('rejects empty input payload', async () => {
    const req = new Request('http://localhost/api/workspace/run', {
      method: 'POST',
      body: JSON.stringify({ kind: 'input', text: '' }),
    })

    const res = await POST(req)

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({ error: '请输入有效内容。' })
    expect(runWorkspaceMock).not.toHaveBeenCalled()
  })

  it('forwards authenticated input requests into the workspace runner', async () => {
    runWorkspaceMock.mockImplementationOnce(({ onEvent }) => {
      onEvent({
        phase: 'parse',
        status: 'done',
        message: '已理解请求',
      })

      return Promise.resolve({
        ok: true,
        phase: 'completed',
        task: {
          intent: 'query',
          target: 'notes',
        },
        plan: {
          intent: 'query',
          target: 'notes',
          toolName: 'search_notes',
          toolInput: {},
          needsCompose: false,
        },
        data: {
          ok: true,
          target: 'notes',
          items: [],
          total: 0,
        },
        answer: '已找到 0 条笔记。',
      })
    })

    const req = new Request('http://localhost/api/workspace/run', {
      method: 'POST',
      body: JSON.stringify({ kind: 'input', text: '帮我找一下最近笔记' }),
    })

    const res = await POST(req)
    const events = await readSseEvents(res)

    expect(requireWorkspaceUserAccessMock).toHaveBeenCalledTimes(1)
    expect(runWorkspaceMock).toHaveBeenCalledWith({
      message: '帮我找一下最近笔记',
      signal: req.signal,
      userId: 'user_123',
      onEvent: expect.any(Function),
    })
    expect(res.headers.get('content-type')).toContain('text/event-stream')
    expect(events).toEqual([
      {
        type: 'phase',
        phase: {
          phase: 'parse',
          status: 'done',
          message: '已理解请求',
        },
      },
      expect.objectContaining({
        type: 'result',
        response: expect.objectContaining({
          ok: true,
          answer: '已找到 0 条笔记。',
          data: {
            kind: 'query',
            target: 'notes',
            items: [],
            total: 0,
          },
        }),
      }),
    ])
  })

  it('translates quick actions into normalized runner input', async () => {
    const req = new Request('http://localhost/api/workspace/run', {
      method: 'POST',
      body: JSON.stringify({ kind: 'quick-action', action: 'summarize-notes' }),
    })

    await POST(req)

    expect(runWorkspaceMock).toHaveBeenCalledWith({
      message: '总结最近笔记重点',
      signal: req.signal,
      userId: 'user_123',
      onEvent: expect.any(Function),
    })
  })

  it('rejects invalid quick-action values', async () => {
    const req = new Request('http://localhost/api/workspace/run', {
      method: 'POST',
      body: JSON.stringify({ kind: 'quick-action', action: 'invalid-action' }),
    })

    const res = await POST(req)

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({ error: '请求参数无效。' })
    expect(runWorkspaceMock).not.toHaveBeenCalled()
  })

  it('returns normalized error payloads from the runner', async () => {
    runWorkspaceMock.mockResolvedValueOnce({
      ok: false,
      phase: 'tool_failed',
      message: 'tool failed',
    })

    const req = new Request('http://localhost/api/workspace/run', {
      method: 'POST',
      body: JSON.stringify({ kind: 'input', text: '创建待办' }),
    })

    const res = await POST(req)
    const events = await readSseEvents(res)

    expect(events).toEqual([
      {
        type: 'result',
        response: {
          ok: false,
          phases: [],
          answer: null,
          data: {
            kind: 'error',
            phase: 'tool_failed',
            message: 'tool failed',
          },
        },
      },
    ])
  })
})
