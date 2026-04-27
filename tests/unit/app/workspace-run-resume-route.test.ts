import { beforeEach, describe, expect, it, vi } from 'vitest'

import { POST } from '@/app/api/workspace/runs/[runId]/resume/route'

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

describe('/api/workspace/runs/[runId]/resume POST', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireWorkspaceUserAccessMock.mockResolvedValue({ id: 'user_123' })
  })

  it('rejects invalid resume request body', async () => {
    const req = new Request('http://localhost/api/workspace/runs/run_1/resume', {
      method: 'POST',
      body: JSON.stringify({ kind: 'invalid' }),
    })

    const res = await POST(req, { params: { runId: 'run_1' } })

    expect(res.status).toBe(400)
  })

  it('streams resume run events', async () => {
    orchestrateWorkspaceRunMock.mockImplementationOnce(async ({ onEvent }) => {
      onEvent({ type: 'run_completed', result: { summary: 'Done', preview: null, data: null } })
      return { ok: true, phase: 'completed' }
    })

    const req = new Request('http://localhost/api/workspace/runs/run_1/resume', {
      method: 'POST',
      body: JSON.stringify({
        kind: 'resume',
        runId: 'run_1',
        interactionId: 'interaction_1',
        response: { type: 'select_candidate', action: 'select', candidateId: 'todo_1' },
      }),
    })

    const res = await POST(req, { params: { runId: 'run_1' } })

    expect(res.headers.get('content-type')).toContain('text/event-stream')
    const events = await readSseEvents(res)
    expect(events).toContainEqual(expect.objectContaining({ type: 'run_completed' }))
    expect(requireWorkspaceUserAccessMock).toHaveBeenCalled()
    expect(orchestrateWorkspaceRunMock).toHaveBeenCalled()
  })

  it('streams run_failed without exposing raw errors', async () => {
    orchestrateWorkspaceRunMock.mockImplementationOnce(async ({ onEvent }) => {
      onEvent({ type: 'run_failed', error: { code: 'TOOL_FAILED', message: '工具执行失败', retryable: true } })
      return { ok: false, phase: 'execute', message: '工具执行失败' }
    })

    const req = new Request('http://localhost/api/workspace/runs/run_1/resume', {
      method: 'POST',
      body: JSON.stringify({
        kind: 'resume',
        runId: 'run_1',
        interactionId: 'interaction_1',
        response: { type: 'select_candidate', action: 'select', candidateId: 'todo_1' },
      }),
    })

    const res = await POST(req, { params: { runId: 'run_1' } })
    const events = await readSseEvents(res)

    expect(events).toContainEqual(
      expect.objectContaining({
        type: 'run_failed',
        error: expect.objectContaining({ code: 'TOOL_FAILED' }),
      })
    )
  })
})