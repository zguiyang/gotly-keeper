import { LifecycleAssetsClient } from '@/components/workspace/lifecycle-assets-client'
import { requireWorkspaceUserAccess } from '@/server/modules/auth/workspace-session'
import { listWorkspaceArchivedAssets } from '@/server/modules/workspace'

export default async function WorkspaceArchivePage() {
  const user = await requireWorkspaceUserAccess()
  const assets = await listWorkspaceArchivedAssets({ userId: user.id })

  return <LifecycleAssetsClient assets={assets} mode="archive" />
}
