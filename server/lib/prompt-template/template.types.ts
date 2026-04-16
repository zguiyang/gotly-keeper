export type TemplateVariables = Record<string, unknown>

export type RenderPromptOptions = {
  strict?: boolean
  disableCache?: boolean
}

export type TemplateCacheEntry = {
  content: string
  mtimeMs: number
  filePath: string
}
