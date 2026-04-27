import 'server-only'

import type { WorkspaceRunRequest } from '@/shared/workspace/workspace-run-protocol'
import type { WorkspacePendingRunSnapshot } from '@/shared/workspace/workspace-run-protocol'

import { handleNewInput } from './workspace-run-orchestrator.input'
import { handleResume } from './workspace-run-orchestrator.resume'
import { handleQuickAction } from './workspace-run-orchestrator.quickaction'

import { createWorkspaceRunStore } from './workspace-run-store.drizzle'

import type { WorkspaceRunStore } from './workspace-run-store'
import type { WorkspaceRunModel } from './workspace-run-understanding'
import type { SearchWorkspaceRunCandidates } from './workspace-run-planner'

export class WorkspaceRunOrchestratorError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'WorkspaceRunOrchestratorError'
  }
}

export type OrchestrateWorkspaceRunOptions = {
  userId: string
  request: WorkspaceRunRequest
  store: WorkspaceRunStore
  runModel: WorkspaceRunModel
  searchCandidates: SearchWorkspaceRunCandidates
  onEvent?: (event: import('@/shared/workspace/workspace-run-protocol').WorkspaceRunStreamEvent) => void
  signal?: AbortSignal
}

export async function orchestrateWorkspaceRun(
  options: OrchestrateWorkspaceRunOptions
): Promise<{
  ok: boolean
  phase?: string
  message?: string
  result?: unknown
  snapshot?: unknown
}> {
  const { request, signal } = options

  if (signal?.aborted) {
    return {
      ok: false,
      phase: 'aborted',
      message: 'Run was aborted',
    }
  }

  if (request.kind === 'resume') {
    return handleResume(options)
  }

  if (request.kind === 'input') {
    return handleNewInput(options)
  }

  if (request.kind === 'quick-action') {
    return handleQuickAction(options)
  }

  return {
    ok: false,
    phase: 'invalid_request',
    message: 'Unknown request kind',
  }
}

export async function getCurrentAwaitingWorkspaceRun(
  userId: string
): Promise<WorkspacePendingRunSnapshot | null> {
  const store = createWorkspaceRunStore()
  const snapshot = await store.loadLatestAwaiting(userId)
  return snapshot as WorkspacePendingRunSnapshot | null
}
