import { BookmarksClient } from '@/components/workspace/bookmarks-client'
import { requireWorkspaceUserAccess } from '@/server/modules/auth/workspace-session'
import { listWorkspaceAssetsPage } from '@/server/modules/workspace'

export default async function BookmarksPage() {
  const user = await requireWorkspaceUserAccess()

  const initialPage = await listWorkspaceAssetsPage({ userId: user.id, type: 'link' })

  return <BookmarksClient initialPage={initialPage} />
}
