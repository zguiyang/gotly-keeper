import type { AssetListItem } from '@/shared/assets/assets.types'
import type { KeywordCandidate, RankResult, SemanticCandidate } from './search.types'

export function mergeSearchResults(
  semanticResults: SemanticCandidate[],
  keywordCandidates: KeywordCandidate[],
  limit: number
): RankResult[] {
  const SEMANTIC_BASE_SCORE = 10
  const semanticWeight = 1.0
  const keywordWeight = 1.0

  const ranked = new Map<string, { asset: AssetListItem; score: number; source: RankResult['source'] }>()

  for (const result of semanticResults) {
    const asset = toAssetListItem(result.asset)
    ranked.set(asset.id, {
      asset,
      score: Math.max(0, SEMANTIC_BASE_SCORE - result.distance * 10) * semanticWeight,
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

  return Array.from(ranked.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ asset, score, source }) => ({ asset, score, source }))
}

function toAssetListItem(asset: { id: string; originalText: string; type: string; url: string | null; timeText: string | null; dueAt: Date | null; completedAt: Date | null; createdAt: Date }): AssetListItem {
  return {
    id: asset.id,
    originalText: asset.originalText,
    title: asset.originalText.slice(0, 32),
    excerpt: asset.originalText,
    type: asset.type as AssetListItem['type'],
    url: asset.url,
    timeText: asset.timeText,
    dueAt: asset.dueAt,
    completed: asset.completedAt !== null,
    createdAt: asset.createdAt,
  }
}
