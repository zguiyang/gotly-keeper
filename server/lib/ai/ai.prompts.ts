import { ASIA_SHANGHAI_TIME_ZONE } from '@/server/lib/config/time'
import { nowIso, formatShanghaiTime } from '@/shared/time/dayjs'

import { renderPrompt } from '../prompt-template'

export async function buildAssetInterpreterPrompt(
  trimmed: string,
  now?: Date
): Promise<string> {
  const systemTemplate = await renderPrompt('ai/asset-interpreter.system', {})
  const userTemplate = await renderPrompt('ai/asset-interpreter.user', {
    nowIso: nowIso(now),
    timezone: ASIA_SHANGHAI_TIME_ZONE,
    localDateTime: formatShanghaiTime(now),
    userInputJson: JSON.stringify(trimmed),
  })

  return [systemTemplate, userTemplate].join('\n\n')
}
