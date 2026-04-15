import { WorkspaceClient } from '@/components/workspace/workspace-client'
import { requireWorkspaceUserAccess } from '@/server/modules/auth/workspace-session'
import { listWorkspaceRecentAssets } from '@/server/modules/workspace'

export default async function WorkspacePage() {
  const user = await requireWorkspaceUserAccess()

  const recentAssets = await listWorkspaceRecentAssets(user.id)

  return <WorkspaceClient recentAssets={recentAssets} />
}
