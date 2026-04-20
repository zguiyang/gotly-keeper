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
  vars: Record<string, unknown> = {}
): Promise<string> {
  return buildComposedSystemPrompt(scopedSystemPromptPath, vars)
}
