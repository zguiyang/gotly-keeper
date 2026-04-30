import 'server-only'

import { and, desc, eq, ne } from 'drizzle-orm'

import { db } from '@/server/lib/db'
import { workspaceRuns } from '@/server/lib/db/schema'
import { now } from '@/shared/time/dayjs'

import type { WorkspaceReviewPendingRunSnapshot } from './workspace-run-review'
import type {
  WorkspaceRunStatus,
  WorkspaceRunStore,
} from './workspace-run-store'

export function createWorkspaceRunStore(): WorkspaceRunStore {
  return {
    async saveSnapshot(
      snapshot: WorkspaceReviewPendingRunSnapshot,
      userId: string
    ): Promise<void> {
      await db
        .insert(workspaceRuns)
        .values({
          id: `wr_${crypto.randomUUID()}`,
          userId,
          runId: snapshot.runId,
          phase: snapshot.phase,
          status: snapshot.status,
          snapshot: snapshot as unknown as Record<string, unknown>,
          createdAt: now(),
          updatedAt: now(),
        })
        .onConflictDoUpdate({
          target: workspaceRuns.runId,
          set: {
            phase: snapshot.phase,
            status: snapshot.status,
            snapshot: snapshot as unknown as Record<string, unknown>,
            updatedAt: now(),
          },
        })
    },

    async loadLatestAwaiting(
      userId: string
    ): Promise<WorkspaceReviewPendingRunSnapshot | null> {
      const row = await db.query.workspaceRuns.findFirst({
        where: and(
          eq(workspaceRuns.userId, userId),
          eq(workspaceRuns.status, 'awaiting_user')
        ),
        orderBy: [desc(workspaceRuns.updatedAt), desc(workspaceRuns.id)],
      })

      if (!row) {
        return null
      }

      return row.snapshot as unknown as WorkspaceReviewPendingRunSnapshot
    },

    async failAwaitingRuns(
      userId: string,
      options?: { excludeRunId?: string }
    ): Promise<number> {
      const filters = [
        eq(workspaceRuns.userId, userId),
        eq(workspaceRuns.status, 'awaiting_user'),
      ]

      if (options?.excludeRunId) {
        filters.push(ne(workspaceRuns.runId, options.excludeRunId))
      }

      const result = await db
        .update(workspaceRuns)
        .set({
          status: 'failed',
          updatedAt: now(),
        })
        .where(and(...filters))

      return result.rowCount ?? 0
    },

    async updateRunStatus(runId: string, userId: string, status: WorkspaceRunStatus): Promise<boolean> {
      const result = await db
        .update(workspaceRuns)
        .set({
          status,
          updatedAt: now(),
        })
        .where(and(
          eq(workspaceRuns.runId, runId),
          eq(workspaceRuns.userId, userId)
        ))
      return (result.rowCount ?? 0) > 0
    },

    async deleteRun(runId: string, userId: string): Promise<void> {
      await db.delete(workspaceRuns).where(and(
        eq(workspaceRuns.runId, runId),
        eq(workspaceRuns.userId, userId)
      ))
    },
  }
}

export const workspaceRunStore = createWorkspaceRunStore()
