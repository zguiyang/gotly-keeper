import { WorkspaceClient } from '@/components/workspace/workspace-client'
import { listWorkspaceRecentAssets } from '@/server/modules/assets/assets.service'
import { requireWorkspaceUserAccess } from '@/server/modules/auth/workspace-session'

export default async function WorkspacePage() {
  const user = await requireWorkspaceUserAccess()

  const recentAssets = await listWorkspaceRecentAssets(user.id)

  return <WorkspaceClient recentAssets={recentAssets} />
}
