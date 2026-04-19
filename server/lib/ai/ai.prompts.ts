import { ASIA_SHANGHAI_TIME_ZONE } from '@/server/lib/config/time'
import { renderPrompt } from '@/server/lib/prompt-template'
import { nowIso, formatShanghaiTime } from '@/shared/time/dayjs'

export async function buildAssetInterpreterPrompt(
  trimmed: string,
  now?: Date
): Promise<string> {
  const [systemTemplate, userTemplate] = await Promise.all([
    renderPrompt('ai/asset-interpreter.system', {}),
    renderPrompt('ai/asset-interpreter.user', {
      nowIso: nowIso(now),
      timezone: ASIA_SHANGHAI_TIME_ZONE,
      localDateTime: formatShanghaiTime(now),
      userInputJson: JSON.stringify(trimmed),
    }),
  ])

  return [
    systemTemplate,
    userTemplate,
    '请直接返回符合 ParsedCommand 的 JSON 对象，不要输出解释、备注、Markdown、代码块。',
  ].join('\n\n')
}
