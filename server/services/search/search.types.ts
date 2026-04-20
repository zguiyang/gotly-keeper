import type { AssetListItem } from '@/shared/assets/assets.types'
import type { WorkspaceAgentTimeFilter } from '@/shared/workspace/workspace-run.types'

export type AssetType = AssetListItem['type']
export type AssetSummaryTarget = 'todos' | 'notes' | 'bookmarks'

export type SearchAssetsOptions = {
  userId: string
  query: string
  typeHint?: AssetType | null
  timeFilter?: WorkspaceAgentTimeFilter | null
  completionHint?: 'complete' | 'incomplete' | null
  includeArchived?: boolean
  limit?: number
}

export type SearchAssetsCommand = {
  kind: 'search'
  query: string
  typeHint: AssetType | null
  timeFilter: WorkspaceAgentTimeFilter | null
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
  timeFilter: WorkspaceAgentTimeFilter | null
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
  timeFilterKind: 'none' | 'exact_range' | 'vague'
  completionHint: 'complete' | 'incomplete' | null
  timeFilterApplied: boolean
  semanticAttempted: boolean
  semanticFailed: boolean
  semanticCandidateCount: number
  keywordCandidateCount: number
  returnedCount: number
}
