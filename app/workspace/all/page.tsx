import { AllClient } from '@/components/workspace/all-client'
import { listWorkspaceAssets } from '@/server/modules/assets/assets.service'
import { requireWorkspaceUserAccess } from '@/server/modules/auth/workspace-session'

export default async function AllPage() {
  const user = await requireWorkspaceUserAccess()

  const assets = await listWorkspaceAssets({ userId: user.id })

  return <AllClient assets={assets} />
}
