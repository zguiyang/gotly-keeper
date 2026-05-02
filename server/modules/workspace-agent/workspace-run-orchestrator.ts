import 'server-only'


import { handleNewInput } from './workspace-run-orchestrator.input'
import { handleQuickAction } from './workspace-run-orchestrator.quickaction'
import { handleResume } from './workspace-run-orchestrator.resume'
import { createWorkspaceRunStore } from './workspace-run-store.drizzle'

import type { SearchWorkspaceRunCandidates } from './workspace-run-planner'
import type { WorkspaceRunStore } from './workspace-run-store'
import type { WorkspaceRunModel } from './workspace-run-understanding'
import type {
  WorkspacePendingRunSnapshot,
  WorkspaceRunRequest,
  WorkspaceRunResult,
  WorkspaceRunStreamEvent,
} from '@/shared/workspace/workspace-run-protocol'

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
  onEvent?: (event: WorkspaceRunStreamEvent) => void
  signal?: AbortSignal
}

export type WorkspaceRunOrchestratorResult = {
  ok: boolean
  phase?: string
  message?: string
  result?: WorkspaceRunResult
  snapshot?: WorkspacePendingRunSnapshot
}

export async function orchestrateWorkspaceRun(
  options: OrchestrateWorkspaceRunOptions
): Promise<WorkspaceRunOrchestratorResult> {
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
  return store.loadLatestAwaiting(userId)
}

export async function dismissCurrentAwaitingWorkspaceRun(
  userId: string
): Promise<boolean> {
  const store = createWorkspaceRunStore()
  const snapshot = await store.loadLatestAwaiting(userId)

  if (!snapshot) {
    return false
  }

  await store.deleteRun(snapshot.runId, userId)
  return true
}
