import { BookmarksClient } from '@/components/workspace/bookmarks-client'
import { requireWorkspaceUserOrRedirect } from '@/server/auth/workspace-session'
import { listLinkAssets } from '@/server/assets/assets.service'

export default async function BookmarksPage() {
  const user = await requireWorkspaceUserOrRedirect()

  const bookmarks = await listLinkAssets(user.id)

  return <BookmarksClient bookmarks={bookmarks} />
}