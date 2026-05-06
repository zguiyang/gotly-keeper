import { SEMANTIC_BASE_SCORE, SEMANTIC_DISTANCE_PENALTY } from '@/server/lib/config/constants'

import type { KeywordCandidate, RankResult, SemanticCandidate } from './search.types'
import type { AssetListItem } from '@/shared/assets/assets.types'

const RECENCY_BOOST_FACTOR = 0.3
const RECENCY_BOOST_WINDOW_MS = 24 * 60 * 60 * 1000

export function mergeSearchResults(
  semanticResults: SemanticCandidate[],
  keywordCandidates: KeywordCandidate[],
  limit: number,
  preferRecent = false
): RankResult[] {
  const semanticWeight = 1.0
  const keywordWeight = 1.0

  const ranked = new Map<string, { asset: AssetListItem; score: number; source: RankResult['source'] }>()

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

  if (preferRecent) {
    const now = Date.now()
    for (const entry of results) {
      const age = now - entry.asset.createdAt.getTime()
      if (age >= 0 && age <= RECENCY_BOOST_WINDOW_MS) {
        entry.score += RECENCY_BOOST_FACTOR * (1 - age / RECENCY_BOOST_WINDOW_MS)
      }
    }
  }

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ asset, score, source }) => ({ asset, score, source }))
}
