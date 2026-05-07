import { type AssetTimeRangeHint } from '@/server/lib/config/time'

export type SearchTimeCandidate = {
  dueAt: Date | null
  timeText: string | null
  createdAt?: Date
}

export function matchesSearchTimeHint(
  asset: SearchTimeCandidate,
  rangeHint: AssetTimeRangeHint,
  _timeHint: string | null | undefined
) {
  if (asset.dueAt) {
    const dueTime = asset.dueAt.getTime()
    if (
      dueTime >= rangeHint.startsAt.getTime() &&
      dueTime < rangeHint.endsAt.getTime()
    ) {
      return true
    }
  }

  if (asset.createdAt) {
    const createdTime = asset.createdAt.getTime()
    if (
      createdTime >= rangeHint.startsAt.getTime() &&
      createdTime < rangeHint.endsAt.getTime()
    ) {
      return true
    }
  }

  return false
}
