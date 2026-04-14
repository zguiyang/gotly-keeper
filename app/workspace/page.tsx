import { WorkspaceClient } from '@/components/workspace/workspace-client'
import { requireWorkspaceUserOrRedirect } from '@/server/auth/workspace-session'
import { listRecentAssets } from '@/server/assets/assets.service'

export default async function WorkspacePage() {
  const user = await requireWorkspaceUserOrRedirect()

  const recentAssets = await listRecentAssets(user.id)

  return <WorkspaceClient recentAssets={recentAssets} />
}