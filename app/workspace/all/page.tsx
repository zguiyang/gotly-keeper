import { AllClient } from '@/components/workspace/all-client'
import { requireWorkspaceUserAccess } from '@/server/modules/auth/workspace-session'
import { listWorkspaceAssets } from '@/server/modules/workspace'

export default async function AllPage() {
  const user = await requireWorkspaceUserAccess()

  const assets = await listWorkspaceAssets({ userId: user.id })

  return <AllClient assets={assets} />
}
