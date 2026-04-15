import 'server-only'

import { z } from 'zod'

export const assetInputIntentSchema = z.enum([
  'create_note',
  'create_link',
  'create_todo',
  'search_assets',
  'summarize_assets',
])

export const assetSummaryTargetSchema = z.enum([
  'unfinished_todos',
  'recent_notes',
  'recent_bookmarks',
])

export const aiAssetInputSchema = z.object({
  intent: assetInputIntentSchema,
  originalText: z.string().min(1),
  query: z.string().nullable(),
  assetType: z.enum(['note', 'link', 'todo']).nullable(),
  url: z.string().nullable(),
  timeText: z.string().nullable(),
  dueAtIso: z.string().datetime().nullable(),
  typeHint: z.enum(['note', 'link', 'todo']).nullable(),
  completionHint: z.enum(['complete', 'incomplete']).nullable(),
  summaryTarget: assetSummaryTargetSchema.nullable(),
  confidence: z.number().min(0).max(1),
})

export type AiAssetInput = z.infer<typeof aiAssetInputSchema>
