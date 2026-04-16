import 'server-only'

import { and, eq } from 'drizzle-orm'

import { db } from '@/server/lib/db'
import { assets } from '@/server/lib/db/schema'
import { now } from '@/shared/time/dayjs'

import type { BookmarkMeta } from '@/shared/assets/bookmark-meta.types'

type UpdateBookmarkMetaInput = {
  assetId: string
  userId: string
  bookmarkMeta: BookmarkMeta
}

export async function updateAssetBookmarkMeta({
  assetId,
  userId,
  bookmarkMeta,
}: UpdateBookmarkMetaInput): Promise<void> {
  await db
    .update(assets)
    .set({
      bookmarkMeta,
      updatedAt: now(),
    })
    .where(and(eq(assets.id, assetId), eq(assets.userId, userId), eq(assets.type, 'link')))
}

