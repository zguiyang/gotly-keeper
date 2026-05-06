import { SEMANTIC_BASE_SCORE, SEMANTIC_DISTANCE_PENALTY } from '@/server/lib/config/constants'

import type { KeywordCandidate, RankResult, SemanticCandidate } from './search.types'
import type { AssetListItem } from '@/shared/assets/assets.types'

const RECENCY_PRIORITY_WINDOW_MS = 72 * 60 * 60 * 1000

type RankedEntry = {
  asset: AssetListItem
  score: number
  source: RankResult['source']
}

function isWithinRecencyPriorityWindow(asset: AssetListItem, now: number) {
  const age = now - asset.createdAt.getTime()
  return age >= 0 && age <= RECENCY_PRIORITY_WINDOW_MS
}

function compareByScoreThenCreatedAt(a: RankedEntry, b: RankedEntry) {
  if (b.score !== a.score) {
    return b.score - a.score
  }

  return b.asset.createdAt.getTime() - a.asset.createdAt.getTime()
}

export function mergeSearchResults(
  semanticResults: SemanticCandidate[],
  keywordCandidates: KeywordCandidate[],
  limit: number,
  preferRecent = false
): RankResult[] {
  const semanticWeight = 1.0
  const keywordWeight = 1.0

  const ranked = new Map<string, RankedEntry>()

  for (const result of semanticResults) {
    ranked.set(result.asset.id, {
      asset: result.asset,
      score: Math.max(0, SEMANTIC_BASE_SCORE - result.distance * SEMANTIC_DISTANCE_PENALTY) * semanticWeight,
      source: 'semantic',
    })
  }

  for (const candidate of keywordCandidates) {
    const existing = ranked.get(candidate.asset.id)
    if (existing) {
      existing.score += candidate.score * keywordWeight
      existing.source = 'merged'
    } else {
      ranked.set(candidate.asset.id, {
        asset: candidate.asset,
        score: candidate.score * keywordWeight,
        source: 'keyword',
      })
    }
  }

  const results = Array.from(ranked.values())

  const now = preferRecent ? Date.now() : null

  return results
    .sort((a, b) => {
      if (now === null) {
        return compareByScoreThenCreatedAt(a, b)
      }

      const aIsRecent = isWithinRecencyPriorityWindow(a.asset, now)
      const bIsRecent = isWithinRecencyPriorityWindow(b.asset, now)

      if (aIsRecent !== bIsRecent) {
        return aIsRecent ? -1 : 1
      }

      return compareByScoreThenCreatedAt(a, b)
    })
    .slice(0, limit)
    .map(({ asset, score, source }) => ({ asset, score, source }))
}
