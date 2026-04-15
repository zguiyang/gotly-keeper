import { NotesClient } from '@/components/workspace/notes-client'
import { requireWorkspaceUserOrRedirect } from '@/server/modules/auth/workspace-session'
import { listNoteAssets } from '@/server/modules/assets/assets.service'

export default async function NotesPage() {
  const user = await requireWorkspaceUserOrRedirect()

  const notes = await listNoteAssets(user.id)

  return <NotesClient notes={notes} />
}
