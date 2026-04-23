import { NotesClient } from '@/components/workspace/notes-client'
import { requireWorkspaceUserAccess } from '@/server/modules/auth/workspace-session'
import { listWorkspaceAssetsPage } from '@/server/modules/workspace'

export default async function NotesPage() {
  const user = await requireWorkspaceUserAccess()

  const initialPage = await listWorkspaceAssetsPage({ userId: user.id, type: 'note' })

  return <NotesClient initialPage={initialPage} />
}
