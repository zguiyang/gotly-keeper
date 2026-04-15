import 'server-only'

import { and, eq } from 'drizzle-orm'

import { db } from '@/server/lib/db'
import { assets } from '@/server/lib/db/schema'
import { type AssetListItem } from '@/shared/assets/assets.types'
import { now } from '@/shared/time/dayjs'

import { toAssetListItem } from './assets.mapper'

type SetTodoCompletionInput = {
  userId: string
  assetId: string
  completed: boolean
}

export async function setTodoCompletion({
  userId,
  assetId,
  completed,
}: SetTodoCompletionInput): Promise<AssetListItem | null> {
  const [updated] = await db
    .update(assets)
    .set({
      completedAt: completed ? now() : null,
      updatedAt: now(),
    })
    .where(
      and(
        eq(assets.id, assetId),
        eq(assets.userId, userId),
        eq(assets.type, 'todo')
      )
    )
    .returning()

  return updated ? toAssetListItem(updated) : null
}
