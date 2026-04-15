import { NotesClient } from '@/components/workspace/notes-client'
import { listWorkspaceNoteAssets } from '@/server/modules/assets/assets.service'
import { requireWorkspaceUserAccess } from '@/server/modules/auth/workspace-session'

export default async function NotesPage() {
  const user = await requireWorkspaceUserAccess()

  const notes = await listWorkspaceNoteAssets(user.id)

  return <NotesClient notes={notes} />
}
