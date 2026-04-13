import 'server-only'

import { type AssetTimeRangeHint } from './assets.time'

type AssetSearchTimeCandidate = {
  dueAt: Date | null
  timeText: string | null
}

export function getAssetSearchTimeTextAliases(timeHint: string | null | undefined) {
  const normalized = timeHint?.trim()
  if (!normalized) return []

  if (normalized.includes('这周') || normalized.includes('本周')) {
    return ['这周', '本周']
  }

  return [normalized]
}

export function matchesAssetSearchTimeHint(
  asset: AssetSearchTimeCandidate,
  rangeHint: AssetTimeRangeHint,
  timeHint: string | null | undefined
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

  const timeText = asset.timeText?.trim()
  if (!timeText) return false

  return getAssetSearchTimeTextAliases(timeHint).some((alias) =>
    timeText.includes(alias)
  )
}
