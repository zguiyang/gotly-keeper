import { loadTemplate } from './template-loader'
import { renderTemplate } from './template-renderer'

import type { RenderPromptOptions, TemplateVariables } from './template.types'

export async function renderPrompt(
  templateId: string,
  variables: TemplateVariables,
  options?: RenderPromptOptions
): Promise<string> {
  const template = await loadTemplate(templateId, {
    disableCache: options?.disableCache,
  })

  return renderTemplate(
    templateId,
    template,
    variables,
    options?.strict ?? true
  )
}
