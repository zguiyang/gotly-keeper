import type { SemanticCandidate, KeywordCandidate, RankResult } from './search.types'

export type SearchFallbackStrategy =
  | 'semantic-only'
  | 'keyword-only'
  | 'hybrid'
  | 'empty'

export type SearchFallbackResult = {
  strategy: SearchFallbackStrategy
  semanticResults: SemanticCandidate[]
  keywordCandidates: KeywordCandidate[]
  ranked: RankResult[]
  semanticFailed: boolean
  fallbackTriggered: boolean
}

export function determineSearchFallbackStrategy(
  semanticAttempted: boolean,
  semanticFailed: boolean,
  semanticResultsCount: number,
  keywordCandidatesCount: number
): SearchFallbackStrategy {
  if (!semanticAttempted || semanticFailed) {
    return 'keyword-only'
  }

  if (semanticResultsCount === 0 && keywordCandidatesCount === 0) {
    return 'empty'
  }

  if (semanticResultsCount === 0) {
    return 'keyword-only'
  }

  return 'hybrid'
}

export function shouldFallbackToKeyword(semanticFailed: boolean, semanticResultsCount: number): boolean {
  return semanticFailed || semanticResultsCount === 0
}

export function createSearchFallbackMessage(
  strategy: SearchFallbackStrategy,
  query: string
): string | null {
  switch (strategy) {
    case 'keyword-only':
      return `Search completed using keyword matching for "${query}"`
    case 'empty':
      return `No results found for "${query}"`
    case 'hybrid':
      return null
    case 'semantic-only':
      return null
    default:
      return null
  }
}

export function mergeWithFallback(
  semanticResults: SemanticCandidate[],
  keywordCandidates: KeywordCandidate[],
  semanticFailed: boolean,
  limit: number
): { ranked: RankResult[]; fallbackTriggered: boolean } {
  const fallbackTriggered = shouldFallbackToKeyword(semanticFailed, semanticResults.length)

  if (fallbackTriggered) {
    const fallbackRanked = keywordCandidates.map((c) => ({
      asset: c.asset,
      score: c.score,
      source: 'keyword' as const,
    }))

    return {
      ranked: fallbackRanked.slice(0, limit),
      fallbackTriggered: true,
    }
  }

  return {
    ranked: [],
    fallbackTriggered: false,
  }
}
