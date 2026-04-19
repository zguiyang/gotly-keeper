import { beforeEach, describe, expect, it, vi } from 'vitest'

const requireWorkspaceUserAccessMock = vi.hoisted(() => vi.fn())
const streamWorkspaceRunMock = vi.hoisted(() => vi.fn())
const streamResponse = vi.hoisted(() => new Response('stream'))

vi.mock('@/server/modules/auth/workspace-session', () => ({
  requireWorkspaceUserAccess: requireWorkspaceUserAccessMock,
}))

vi.mock('@/server/modules/workspace/workspace-stream', () => ({
  QUICK_ACTION_PROMPTS: {
    'review-todos': '请复盘我当前未完成的待办，提炼重点、风险和下一步行动。',
    'summarize-notes': '请总结我最近的笔记，提炼关键信息和下一步行动。',
    'summarize-bookmarks': '请总结我最近收藏的书签，提炼值得关注的主题和下一步行动。',
  },
  streamWorkspaceRun: streamWorkspaceRunMock,
}))

import { POST } from '@/app/api/workspace/run/route'

describe('/api/workspace/run POST', () => {
  beforeEach(() => {
    requireWorkspaceUserAccessMock.mockReset()
    streamWorkspaceRunMock.mockReset()

    requireWorkspaceUserAccessMock.mockResolvedValue({ id: 'user_123' })
    streamWorkspaceRunMock.mockReturnValue(streamResponse)
  })

  it('rejects empty input payload', async () => {
    const req = new Request('http://localhost/api/workspace/run', {
      method: 'POST',
      body: JSON.stringify({ kind: 'input', text: '' }),
    })

    const res = await POST(req)

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({ error: '请输入有效内容。' })
    expect(streamWorkspaceRunMock).not.toHaveBeenCalled()
  })

  it('forwards authenticated input requests into workspace stream', async () => {
    const req = new Request('http://localhost/api/workspace/run', {
      method: 'POST',
      body: JSON.stringify({ kind: 'input', text: '帮我记一下发布清单' }),
    })

    const res = await POST(req)

    expect(res).toBe(streamResponse)
    expect(requireWorkspaceUserAccessMock).toHaveBeenCalledTimes(1)
    expect(streamWorkspaceRunMock).toHaveBeenCalledWith({
      userId: 'user_123',
      request: { kind: 'input', text: '帮我记一下发布清单' },
    })
  })

  it('forwards quick actions without doing route-level classification', async () => {
    const req = new Request('http://localhost/api/workspace/run', {
      method: 'POST',
      body: JSON.stringify({ kind: 'quick-action', action: 'summarize-notes' }),
    })

    await POST(req)

    expect(streamWorkspaceRunMock).toHaveBeenCalledWith({
      userId: 'user_123',
      request: { kind: 'quick-action', action: 'summarize-notes' },
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
    expect(streamWorkspaceRunMock).not.toHaveBeenCalled()
  })

  it('rejects quick-action values from prototype keys', async () => {
    const req = new Request('http://localhost/api/workspace/run', {
      method: 'POST',
      body: JSON.stringify({ kind: 'quick-action', action: 'toString' }),
    })

    const res = await POST(req)

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({ error: '请求参数无效。' })
    expect(streamWorkspaceRunMock).not.toHaveBeenCalled()
  })

  it('returns the stream response directly without provider-gating in route', async () => {
    const req = new Request('http://localhost/api/workspace/run', {
      method: 'POST',
      body: JSON.stringify({ kind: 'input', text: '总结一下最近内容' }),
    })

    const res = await POST(req)

    expect(res).toBe(streamResponse)
    expect(streamWorkspaceRunMock).toHaveBeenCalledTimes(1)
  })
})
