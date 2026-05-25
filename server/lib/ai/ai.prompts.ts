import { renderPrompt } from '@/server/lib/prompt-template'

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
  vars: Record<string, unknown> = {},
  locale?: string
): Promise<string> {
  const prompt = await buildComposedSystemPrompt(scopedSystemPromptPath, vars)

  if (locale) {
    return `${prompt}\n\n## Language Directive\nThe user's system language is **${locale}**. Always reply in **${locale}**.`
  }

  return prompt
}
