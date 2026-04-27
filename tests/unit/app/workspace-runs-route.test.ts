import { beforeEach, describe, expect, it, vi } from 'vitest'

import { POST } from '@/app/api/workspace/runs/route'

const requireWorkspaceUserAccessMock = vi.hoisted(() => vi.fn())
const orchestrateWorkspaceRunMock = vi.hoisted(() => vi.fn())

vi.mock('@/server/modules/auth/workspace-session', () => ({
  requireWorkspaceUserAccess: requireWorkspaceUserAccessMock,
}))

vi.mock('@/server/modules/workspace-agent/workspace-run-orchestrator', () => ({
  orchestrateWorkspaceRun: orchestrateWorkspaceRunMock,
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

describe('/api/workspace/runs POST', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireWorkspaceUserAccessMock.mockResolvedValue({ id: 'user_123' })
  })

  it('rejects invalid request body', async () => {
    const req = new Request('http://localhost/api/workspace/runs', {
      method: 'POST',
      body: JSON.stringify({ kind: 'invalid' }),
    })

    const res = await POST(req)

    expect(res.status).toBe(400)
  })

  it('streams workspace run events', async () => {
    orchestrateWorkspaceRunMock.mockImplementationOnce(async ({ onEvent }) => {
      onEvent({ type: 'phase_started', phase: 'normalize' })
      onEvent({ type: 'phase_completed', phase: 'normalize' })
      onEvent({ type: 'phase_started', phase: 'understand' })
      onEvent({ type: 'phase_completed', phase: 'understand' })
      onEvent({ type: 'phase_started', phase: 'plan' })
      onEvent({ type: 'phase_completed', phase: 'plan' })
      onEvent({ type: 'phase_started', phase: 'preview' })
      onEvent({ type: 'phase_completed', phase: 'preview' })
      onEvent({ type: 'run_completed', result: { summary: 'Done', preview: null, data: null } })
      return { ok: true, phase: 'completed' }
    })

    const req = new Request('http://localhost/api/workspace/runs', {
      method: 'POST',
      body: JSON.stringify({ kind: 'input', text: '记个待办：发报价' }),
    })

    const res = await POST(req)

    expect(res.headers.get('content-type')).toContain('text/event-stream')
    const events = await readSseEvents(res)
    expect(events).toContainEqual(expect.objectContaining({ type: 'phase_started', phase: 'normalize' }))
    expect(events).toContainEqual(expect.objectContaining({ type: 'run_completed' }))
    expect(requireWorkspaceUserAccessMock).toHaveBeenCalled()
    expect(orchestrateWorkspaceRunMock).toHaveBeenCalled()
  })

  it('streams run_failed without exposing raw errors', async () => {
    orchestrateWorkspaceRunMock.mockImplementationOnce(async ({ onEvent }) => {
      onEvent({ type: 'run_failed', error: { code: 'TOOL_FAILED', message: '工具执行失败', retryable: true } })
      return { ok: false, phase: 'execute', message: '工具执行失败' }
    })

    const req = new Request('http://localhost/api/workspace/runs', {
      method: 'POST',
      body: JSON.stringify({ kind: 'input', text: '记个待办：发报价' }),
    })

    const res = await POST(req)
    const events = await readSseEvents(res)

    expect(events).toContainEqual(
      expect.objectContaining({
        type: 'run_failed',
        error: expect.objectContaining({ code: 'TOOL_FAILED' }),
      })
    )
  })

  it('streams awaiting_user interaction', async () => {
    orchestrateWorkspaceRunMock.mockImplementationOnce(async ({ onEvent }) => {
      onEvent({ type: 'phase_started', phase: 'normalize' })
      onEvent({ type: 'phase_completed', phase: 'normalize' })
      onEvent({ type: 'phase_started', phase: 'understand' })
      onEvent({ type: 'phase_completed', phase: 'understand' })
      onEvent({ type: 'phase_started', phase: 'plan' })
      onEvent({ type: 'phase_completed', phase: 'plan' })
      onEvent({ type: 'phase_started', phase: 'review' })
      onEvent({ type: 'phase_completed', phase: 'review' })
      onEvent({ type: 'phase_started', phase: 'preview' })
      onEvent({ type: 'phase_completed', phase: 'preview' })
      onEvent({
        type: 'awaiting_user',
        interaction: {
          runId: 'run_1',
          id: 'interaction_1',
          type: 'select_candidate',
          target: 'todo',
          message: '找到多个待办，请选择',
          actions: ['select', 'skip', 'cancel'],
          candidates: [],
        },
      })
      return { ok: true, phase: 'review', snapshot: {} }
    })

    const req = new Request('http://localhost/api/workspace/runs', {
      method: 'POST',
      body: JSON.stringify({ kind: 'input', text: '更新报价' }),
    })

    const res = await POST(req)
    const events = await readSseEvents(res)

    expect(events).toContainEqual(
      expect.objectContaining({
        type: 'awaiting_user',
        interaction: expect.objectContaining({ type: 'select_candidate' }),
      })
    )
  })
})