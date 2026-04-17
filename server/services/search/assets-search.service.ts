import 'server-only'

import {
  ASSET_LIST_LIMIT_MIN,
  ASSET_LIST_LIMIT_MAX,
  ASSET_SEARCH_LIMIT_DEFAULT,
  KEYWORD_TERM_MAX_COUNT,
  KEYWORD_TERM_MIN_LENGTH,
} from '@/server/lib/config/constants'

import { searchByKeyword } from './keyword-search.service'
import { logSearchPath } from './search.logging'
import { normalizeSearchText } from './search.query-parser'
import { mergeSearchResults } from './search.ranker'
import { parseSearchTimeHint } from './search.time-hint'
import { matchesSearchTimeHint } from './search.time-match'
import { searchByEmbedding } from './semantic-search.service'

import type { SearchAssetsOptions } from './search.types'
import type { AssetListItem } from '@/shared/assets/assets.types'


function clampAssetListLimit(limit = ASSET_SEARCH_LIMIT_DEFAULT) {
  return Math.min(Math.max(ASSET_LIST_LIMIT_MIN, limit), ASSET_LIST_LIMIT_MAX)
}

export async function searchAssets({
  userId,
  query,
  typeHint,
  timeHint,
  completionHint,
  includeArchived = false,
  limit = ASSET_SEARCH_LIMIT_DEFAULT,
}: SearchAssetsOptions): Promise<AssetListItem[]> {
  const trimmed = query.trim()
  if (!trimmed) return []

  const timeRangeHint = parseSearchTimeHint(timeHint)
  const timeFilter =
    timeRangeHint && typeHint === 'todo'
      ? { rangeHint: timeRangeHint, timeHint }
      : null

  let semanticResults: Awaited<ReturnType<typeof searchByEmbedding>> = []
  let semanticFailed = false

  try {
    semanticResults = (
      await searchByEmbedding({
        userId,
        query: trimmed,
        typeHint,
        completionHint,
        includeArchived,
        limit: clampAssetListLimit(limit),
      })
    ).filter(
      (result) =>
        !timeFilter ||
        matchesSearchTimeHint(result.asset, timeFilter.rangeHint, timeFilter.timeHint)
    )
  } catch (error) {
    semanticFailed = true
    console.warn('[search] Semantic search failed; using keyword fallback', {
      error: error instanceof Error ? error.message : String(error),
    })
  }

  const terms = normalizeSearchText(trimmed)
    .split(/\s+/)
    .filter((t) => t.length >= KEYWORD_TERM_MIN_LENGTH)
    .slice(0, KEYWORD_TERM_MAX_COUNT)

  const keywordCandidates = await searchByKeyword({
    userId,
    terms,
    typeHint,
    completionHint,
    includeArchived,
    timeRangeHint,
  })

  const filteredKeywordCandidates = keywordCandidates.filter(
    (candidate) =>
      !timeFilter ||
      matchesSearchTimeHint(
        candidate.asset,
        timeFilter.rangeHint,
        timeFilter.timeHint
      )
  )

  const ranked = mergeSearchResults(
    semanticResults,
    filteredKeywordCandidates,
    clampAssetListLimit(limit)
  )

  const results = ranked.map((r) => r.asset)

  logSearchPath({
    query: trimmed,
    typeHint,
    timeHint,
    completionHint,
    timeFilterApplied: Boolean(timeFilter),
    semanticAttempted: true,
    semanticFailed,
    semanticCandidateCount: semanticResults.length,
    keywordCandidateCount: filteredKeywordCandidates.length,
    returnedCount: results.length,
  })

  return results
}
