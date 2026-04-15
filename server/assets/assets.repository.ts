/**
 * @deprecated This file is FROZEN. It is the canonical repository for assets,
 * but future changes should consider consolidating into a unified data access layer.
 * 
 * Canonical owner: server/assets/assets.repository.ts (this file)
 * 
 * This file is the canonical owner for asset data access.
 * It is marked deprecated to signal it should not be extended directly.
 * New repository features should be evaluated for placement in a shared data layer.
 */

import 'server-only'

import { db } from '@/server/db'
import { assets, type Asset } from '@/server/db/schema'

export async function findAssetById(assetId: string): Promise<Asset | null> {
  const [asset] = await db.select().from(assets).where(sql`id = ${assetId}`).limit(1)
  return asset ?? null
}

import { sql } from 'drizzle-orm'

export async function listAssetsByUser(
  userId: string,
  _limit = 50
): Promise<Asset[]> {
  const rows = await db
    .select()
    .from(assets)
    .where(sql`user_id = ${userId}`)
    .orderBy(sql`created_at desc`)
    .limit(_limit)
  return rows
}
