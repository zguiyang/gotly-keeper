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
import { getAssetSearchTerms } from './search.query-parser'
import { mergeSearchResults } from './search.ranker'
import { matchesSearchTimeHint } from './search.time-match'
import { searchByEmbedding } from './semantic-search.service'

import type { SearchAssetsOptions } from './search.types'
import type { AssetListItem } from '@/shared/assets/assets.types'


function clampAssetListLimit(limit = ASSET_SEARCH_LIMIT_DEFAULT) {
  return Math.min(Math.max(ASSET_LIST_LIMIT_MIN, limit), ASSET_LIST_LIMIT_MAX)
}

function getExactTimeRange(timeFilter: SearchAssetsOptions['timeFilter']) {
  if (!timeFilter || timeFilter.kind !== 'exact_range') {
    return null
  }

  const startsAt = new Date(timeFilter.startIso)
  const endsAt = new Date(timeFilter.endIso)

  if (
    Number.isNaN(startsAt.getTime()) ||
    Number.isNaN(endsAt.getTime()) ||
    startsAt.getTime() >= endsAt.getTime()
  ) {
    return null
  }

  return { startsAt, endsAt }
}

export async function searchAssets({
  userId,
  query,
  typeHint,
  timeFilter,
  completionHint,
  includeArchived = false,
  limit = ASSET_SEARCH_LIMIT_DEFAULT,
}: SearchAssetsOptions): Promise<AssetListItem[]> {
  const trimmed = query.trim()
  if (!trimmed) return []

  const timeRangeHint = getExactTimeRange(timeFilter)
  const timeHint = timeFilter?.kind === 'exact_range' ? timeFilter.phrase : null
  const timeFilterApplied = Boolean(timeRangeHint)

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
        !timeRangeHint || matchesSearchTimeHint(result.asset, timeRangeHint, timeHint)
    )
  } catch (error) {
    semanticFailed = true
    console.warn('[search] Semantic search failed; using keyword fallback', {
      error: error instanceof Error ? error.message : String(error),
    })
  }

  const terms = getAssetSearchTerms(trimmed)
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
      !timeRangeHint || matchesSearchTimeHint(candidate.asset, timeRangeHint, timeHint)
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
    timeFilterKind: timeFilter?.kind ?? 'none',
    completionHint,
    timeFilterApplied,
    semanticAttempted: true,
    semanticFailed,
    semanticCandidateCount: semanticResults.length,
    keywordCandidateCount: filteredKeywordCandidates.length,
    returnedCount: results.length,
  })

  return results
}
