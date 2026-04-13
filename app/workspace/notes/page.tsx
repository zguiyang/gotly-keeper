import { headers } from 'next/headers'

import { NotesClient } from '@/components/workspace/notes-client'
import { auth } from '@/server/auth/auth'
import { listNoteAssets } from '@/server/assets/assets.service'

export default async function NotesPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) {
    return null
  }

  const notes = await listNoteAssets(session.user.id)

  return <NotesClient notes={notes} />
}
