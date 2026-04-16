export class TemplateNotFoundError extends Error {
  constructor(public readonly templateId: string) {
    super(`Template not found: ${templateId}`)
    this.name = 'TemplateNotFoundError'
  }
}

export class TemplateUnsafePathError extends Error {
  constructor(public readonly templateId: string, public readonly path: string) {
    super(`Unsafe path detected in templateId: ${templateId}`)
    this.name = 'TemplateUnsafePathError'
  }
}

export class TemplateMissingVariablesError extends Error {
  constructor(
    public readonly templateId: string,
    public readonly missingVariables: string[]
  ) {
    super(`Missing required variables for template ${templateId}: ${missingVariables.join(', ')}`)
    this.name = 'TemplateMissingVariablesError'
  }
}

export class TemplateRenderError extends Error {
  constructor(public readonly templateId: string, public readonly cause: unknown) {
    super(`Failed to render template ${templateId}`)
    this.name = 'TemplateRenderError'
    this.cause = cause
  }
}
