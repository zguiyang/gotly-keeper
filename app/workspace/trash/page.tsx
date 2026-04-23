import { LifecycleAssetsClient } from '@/components/workspace/lifecycle-assets-client'
import { requireWorkspaceUserAccess } from '@/server/modules/auth/workspace-session'
import { listWorkspaceAssetsPage } from '@/server/modules/workspace'
import { ASSET_LIFECYCLE_STATUS } from '@/shared/assets/asset-lifecycle.types'

export default async function WorkspaceTrashPage() {
  const user = await requireWorkspaceUserAccess()
  const initialPage = await listWorkspaceAssetsPage({
    userId: user.id,
    lifecycleStatus: ASSET_LIFECYCLE_STATUS.TRASHED,
  })

  return <LifecycleAssetsClient initialPage={initialPage} mode="trash" />
}
