import { NotesClient } from '@/components/workspace/notes-client'
import { requireWorkspaceUserAccess } from '@/server/modules/auth/workspace-session'
import { listWorkspaceNoteAssets } from '@/server/modules/workspace'

export default async function NotesPage() {
  const user = await requireWorkspaceUserAccess()

  const notes = await listWorkspaceNoteAssets(user.id)

  return <NotesClient notes={notes} />
}
