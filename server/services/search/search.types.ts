import type { assetSummaryTargetSchema } from '@/server/lib/ai/ai-schema'
import type { AssetListItem } from '@/shared/assets/assets.types'
import type { z } from 'zod'

export type AssetType = AssetListItem['type']
export type AssetSummaryTarget = z.infer<typeof assetSummaryTargetSchema>

export type SearchAssetsOptions = {
  userId: string
  query: string
  typeHint?: AssetType | null
  timeHint?: string | null
  completionHint?: 'complete' | 'incomplete' | null
  includeArchived?: boolean
  limit?: number
}

export type SearchAssetsCommand = {
  kind: 'search'
  query: string
  typeHint: AssetType | null
  timeHint: string | null
  completionHint: 'complete' | 'incomplete' | null
}

export type AssetSummaryCommand = {
  kind: 'summary'
  summaryTarget: AssetSummaryTarget
  query: string
}

export type QueryParseResult = {
  normalizedQuery: string
  terms: string[]
  typeHint: AssetType | null
  timeHint: string | null
  completionHint: 'complete' | 'incomplete' | null
}

export type KeywordCandidate = {
  asset: AssetListItem
  score: number
}

export type SemanticCandidate = {
  asset: AssetListItem
  distance: number
}

export type RankResult = {
  asset: AssetListItem
  score: number
  source: 'semantic' | 'keyword' | 'merged'
}

export type SearchPathLog = {
  query: string
  typeHint: AssetType | null
  timeHint: string | null
  completionHint: 'complete' | 'incomplete' | null
  timeFilterApplied: boolean
  semanticAttempted: boolean
  semanticFailed: boolean
  semanticCandidateCount: number
  keywordCandidateCount: number
  returnedCount: number
}
