import { type Asset } from '@/server/db/schema'

type SearchLogHint = Asset['type'] | null | undefined

export type AssetSearchPathLogInput = {
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

export function buildAssetSearchPathLog(input: AssetSearchPathLogInput) {
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

export function logAssetSearchPath(input: AssetSearchPathLogInput) {
  console.info('[assets.search] Path selected', buildAssetSearchPathLog(input))
}