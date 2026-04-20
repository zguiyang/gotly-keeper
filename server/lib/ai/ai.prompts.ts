import { ASIA_SHANGHAI_TIME_ZONE } from '@/server/lib/config/time'
import { renderPrompt } from '@/server/lib/prompt-template'
import { nowIso, formatShanghaiTime } from '@/shared/time/dayjs'

async function buildComposedSystemPrompt(
  scopedSystemPromptPath: string,
  vars: Record<string, unknown> = {}
): Promise<string> {
  const [globalSystemPrompt, scopedSystemPrompt] = await Promise.all([
    renderPrompt('ai/global.system', {}),
    renderPrompt(scopedSystemPromptPath, vars),
  ])

  return [globalSystemPrompt, scopedSystemPrompt].join('\n\n')
}

export async function buildWorkspaceSystemPrompt(
  scopedSystemPromptPath: string,
  vars: Record<string, unknown> = {}
): Promise<string> {
  return buildComposedSystemPrompt(scopedSystemPromptPath, vars)
}

export async function buildAssetInterpreterPrompt(
  trimmed: string,
  now?: Date
): Promise<string> {
  const [systemTemplate, userTemplate] = await Promise.all([
    buildComposedSystemPrompt('ai/asset-interpreter.system'),
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

export async function buildParsedCommandSystemPrompt(): Promise<string> {
  return buildComposedSystemPrompt('ai/parsed-command.system')
}
