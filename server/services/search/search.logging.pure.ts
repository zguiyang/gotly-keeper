import type { AssetListItem } from '@/shared/assets/assets.types'

type SearchLogHint = AssetListItem['type'] | null | undefined

export type SearchPathLogInput = {
  query: string
  typeHint?: SearchLogHint
  timeHint?: string | null
  completionHint?: 'complete' | 'incomplete' | null
  timeFilterApplied: boolean
  semanticAttempted: boolean
  semanticFailed: boolean
  semanticCandidateCount: number
  keywordCandidateCount: number
  returnedCount: number
}

export function buildSearchPathLog(input: SearchPathLogInput) {
  return {
    queryLength: input.query.length,
    typeHint: input.typeHint ?? null,
    timeHintPresent: Boolean(input.timeHint),
    completionHint: input.completionHint ?? null,
    timeFilterApplied: input.timeFilterApplied,
    semanticAttempted: input.semanticAttempted,
    semanticFailed: input.semanticFailed,
    semanticCandidateCount: input.semanticCandidateCount,
    keywordCandidateCount: input.keywordCandidateCount,
    returnedCount: input.returnedCount,
  }
}
