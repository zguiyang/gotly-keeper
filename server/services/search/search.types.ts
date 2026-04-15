import type { Asset } from '@/server/lib/db/schema'
import type { AssetListItem } from '@/shared/assets/assets.types'
import type { AssetSummaryTarget } from '@/server/services/assets/assets.summary-intent.pure'

export type AssetType = Asset['type']

export type SearchAssetsOptions = {
  userId: string
  query: string
  typeHint?: AssetType | null
  timeHint?: string | null
  completionHint?: 'complete' | 'incomplete' | null
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
  asset: Asset
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
