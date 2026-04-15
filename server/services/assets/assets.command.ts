import 'server-only'

import { db } from '@/server/lib/db'
import { assets } from '@/server/lib/db/schema'
import { interpretAssetInput } from './assets.interpreter'
import { createAssetEmbeddingBestEffort } from './assets.embedding'
import { toAssetListItem } from './assets.mapper'
import { type AssetListItem } from '@/shared/assets/assets.types'
import { type AssetSummaryTarget } from './assets.summary-intent.pure'

export type AssetSummaryCommand = {
  kind: 'summary'
  summaryTarget: AssetSummaryTarget
  query: string
}

type AssetSearchCommand = {
  kind: 'search'
  query: string
  typeHint: 'note' | 'link' | 'todo' | null
  timeHint: string | null
  completionHint: 'complete' | 'incomplete' | null
}

export async function createAsset(input: {
  userId: string
  text: string
}): Promise<{ kind: 'created'; asset: AssetListItem } | AssetSearchCommand | AssetSummaryCommand> {
  const trimmed = input.text.trim()
  if (!trimmed) {
    throw new Error('EMPTY_INPUT')
  }

  const command = await interpretAssetInput(trimmed)

  if (command.intent === 'summarize_assets') {
    return {
      kind: 'summary',
      summaryTarget: command.summaryTarget,
      query: command.query,
    }
  }

  if (command.intent === 'search_assets') {
    return {
      kind: 'search',
      query: command.query,
      typeHint: command.typeHint,
      timeHint: command.timeHint,
      completionHint: command.completionHint,
    }
  }

  if (command.intent === 'create_link') {
    const [created] = await db
      .insert(assets)
      .values({
        id: crypto.randomUUID(),
        userId: input.userId,
        originalText: trimmed,
        type: 'link',
        url: command.url,
        timeText: command.timeText,
        dueAt: command.dueAt,
      })
      .returning()

    createAssetEmbeddingBestEffort(created)

    return { kind: 'created', asset: toAssetListItem(created) }
  }

  if (command.intent === 'create_todo') {
    const [created] = await db
      .insert(assets)
      .values({
        id: crypto.randomUUID(),
        userId: input.userId,
        originalText: trimmed,
        type: 'todo',
        url: command.url,
        timeText: command.timeText,
        dueAt: command.dueAt,
      })
        .returning()

    createAssetEmbeddingBestEffort(created)

    return { kind: 'created', asset: toAssetListItem(created) }
  }

  const [created] = await db
    .insert(assets)
    .values({
      id: crypto.randomUUID(),
      userId: input.userId,
      originalText: trimmed,
      type: 'note',
      url: null,
      timeText: command.timeText,
      dueAt: command.dueAt,
    })
      .returning()

  createAssetEmbeddingBestEffort(created)

  return { kind: 'created', asset: toAssetListItem(created) }
}
