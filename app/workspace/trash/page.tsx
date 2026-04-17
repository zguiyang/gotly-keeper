import { LifecycleAssetsClient } from '@/components/workspace/lifecycle-assets-client'
import { requireWorkspaceUserAccess } from '@/server/modules/auth/workspace-session'
import { listWorkspaceTrashedAssets } from '@/server/modules/workspace'

export default async function WorkspaceTrashPage() {
  const user = await requireWorkspaceUserAccess()
  const assets = await listWorkspaceTrashedAssets({ userId: user.id })

  return <LifecycleAssetsClient assets={assets} mode="trash" />
}
