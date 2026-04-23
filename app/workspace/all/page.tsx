import { AllClient } from '@/components/workspace/all-client'
import { requireWorkspaceUserAccess } from '@/server/modules/auth/workspace-session'
import { listWorkspaceAssetsPage } from '@/server/modules/workspace'

export default async function AllPage() {
  const user = await requireWorkspaceUserAccess()

  const initialPage = await listWorkspaceAssetsPage({ userId: user.id })

  return <AllClient initialPage={initialPage} />
}
