import { NotesClient } from '@/components/workspace/notes-client'
import { requireWorkspaceUserOrRedirect } from '@/server/auth/workspace-session'
import { listNoteAssets } from '@/server/assets/assets.service'

export default async function NotesPage() {
  const user = await requireWorkspaceUserOrRedirect()

  const notes = await listNoteAssets(user.id)

  return <NotesClient notes={notes} />
}
