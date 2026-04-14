import { AllClient } from '@/components/workspace/all-client'
import { requireWorkspaceUserOrRedirect } from '@/server/auth/workspace-session'
import { listAssets } from '@/server/assets/assets.service'

export default async function AllPage() {
  const user = await requireWorkspaceUserOrRedirect()

  const assets = await listAssets({ userId: user.id })

  return <AllClient assets={assets} />
}