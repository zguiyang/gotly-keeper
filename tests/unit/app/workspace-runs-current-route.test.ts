import { beforeEach, describe, expect, it, vi } from 'vitest'

import { GET } from '@/app/api/workspace/runs/current/route'

const requireWorkspaceUserAccessMock = vi.hoisted(() => vi.fn())
const getCurrentAwaitingWorkspaceRunMock = vi.hoisted(() => vi.fn())

vi.mock('@/server/modules/auth/workspace-session', () => ({
  requireWorkspaceUserAccess: requireWorkspaceUserAccessMock,
}))

vi.mock('@/server/modules/workspace-agent/workspace-run-orchestrator', () => ({
  getCurrentAwaitingWorkspaceRun: getCurrentAwaitingWorkspaceRunMock,
}))

describe('/api/workspace/runs/current GET', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireWorkspaceUserAccessMock.mockResolvedValue({ id: 'user_123' })
  })

  it('returns ok:true with run:null when no awaiting run exists', async () => {
    getCurrentAwaitingWorkspaceRunMock.mockResolvedValue(null)

    const res = await GET()

    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe('no-store')
    await expect(res.json()).resolves.toEqual({ ok: true, run: null })
  })

  it('returns ok:true with run snapshot when awaiting run exists', async () => {
    const mockSnapshot = {
      runId: 'run_1',
      interaction: {
        runId: 'run_1',
        id: 'interaction_1',
        type: 'select_candidate' as const,
        target: 'todo' as const,
        message: '找到多个待办，请选择',
        actions: ['select', 'skip', 'cancel'] as const,
        candidates: [],
      },
      timeline: [
        { type: 'phase_started', phase: 'preview' },
        { type: 'phase_completed', phase: 'preview' },
      ],
      understandingPreview: null,
      planPreview: null,
      correctionNotes: [],
      updatedAt: '2026-04-27T01:00:00.000Z',
    }
    getCurrentAwaitingWorkspaceRunMock.mockResolvedValue(mockSnapshot)

    const res = await GET()

    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe('no-store')
    await expect(res.json()).resolves.toMatchObject({
      ok: true,
      run: {
        runId: 'run_1',
        interaction: { type: 'select_candidate' },
      },
    })
  })

  it('calls requireWorkspaceUserAccess', async () => {
    getCurrentAwaitingWorkspaceRunMock.mockResolvedValue(null)

    await GET()

    expect(requireWorkspaceUserAccessMock).toHaveBeenCalled()
  })
})
