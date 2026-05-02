import { requireWorkspaceUserAccess } from '@/server/modules/auth/workspace-session'
import {
  dismissCurrentAwaitingWorkspaceRun,
  getCurrentAwaitingWorkspaceRun,
} from '@/server/modules/workspace-agent/workspace-run-orchestrator'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await requireWorkspaceUserAccess()

  const snapshot = await getCurrentAwaitingWorkspaceRun(user.id)

  return Response.json(
    { ok: true, run: snapshot },
    {
      headers: {
        'cache-control': 'no-store',
      },
    }
  )
}

export async function DELETE() {
  const user = await requireWorkspaceUserAccess()

  const dismissed = await dismissCurrentAwaitingWorkspaceRun(user.id)

  return Response.json(
    { ok: true, dismissed },
    {
      headers: {
        'cache-control': 'no-store',
      },
    }
  )
}
