import { BookmarksClient } from '@/components/workspace/bookmarks-client'
import { listWorkspaceLinkAssets } from '@/server/modules/assets/assets.service'
import { requireWorkspaceUserAccess } from '@/server/modules/auth/workspace-session'

export default async function BookmarksPage() {
  const user = await requireWorkspaceUserAccess()

  const bookmarks = await listWorkspaceLinkAssets(user.id)

  return <BookmarksClient bookmarks={bookmarks} />
}
