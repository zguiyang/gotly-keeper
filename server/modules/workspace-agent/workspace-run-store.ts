import 'server-only'

import type { WorkspaceReviewPendingRunSnapshot } from './workspace-run-review'

export type WorkspaceRunStatus = 'awaiting_user' | 'running' | 'completed' | 'failed'

export interface WorkspaceRunStore {
  saveSnapshot(snapshot: WorkspaceReviewPendingRunSnapshot, userId: string): Promise<void>
  loadLatestAwaiting(userId: string): Promise<WorkspaceReviewPendingRunSnapshot | null>
  updateRunStatus(runId: string, userId: string, status: WorkspaceRunStatus): Promise<boolean>
  deleteRun(runId: string, userId: string): Promise<void>
}
