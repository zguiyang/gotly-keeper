import Mustache from 'mustache'

import {
  TemplateMissingVariablesError,
  TemplateRenderError,
} from './template-errors'

import type { TemplateVariables } from './template.types'

function hasNestedPath(variables: TemplateVariables, key: string): boolean {
  const pathSegments = key.split('.')
  let current: unknown = variables

  for (const segment of pathSegments) {
    if (typeof current !== 'object' || current === null) {
      return false
    }
    if (!Object.prototype.hasOwnProperty.call(current, segment)) {
      return false
    }
    current = (current as Record<string, unknown>)[segment]
  }

  return true
}

export function extractVariables(template: string): string[] {
  const seen = new Set<string>()

  const walk = (tokens: unknown[]): void => {
    for (const token of tokens) {
      if (!Array.isArray(token)) continue

      const tokenType = token[0]
      const tokenValue = token[1]
      const nestedTokens = token[4]

      if (
        (tokenType === 'name' || tokenType === '&') &&
        typeof tokenValue === 'string'
      ) {
        seen.add(tokenValue)
      }

      if (Array.isArray(nestedTokens)) {
        walk(nestedTokens)
      }
    }
  }

  walk(Mustache.parse(template))
  return Array.from(seen)
}

export function validateTemplateVariables(
  templateId: string,
  template: string,
  variables: TemplateVariables,
  strict: boolean
): void {
  if (!strict) return

  const required = extractVariables(template)
  const missing = required.filter((key) => !hasNestedPath(variables, key))

  if (missing.length > 0) {
    throw new TemplateMissingVariablesError(templateId, missing)
  }
}

export function renderTemplate(
  templateId: string,
  template: string,
  variables: TemplateVariables,
  strict: boolean
): string {
  validateTemplateVariables(templateId, template, variables, strict)

  try {
    return Mustache.render(template, variables)
  } catch (error) {
    throw new TemplateRenderError(templateId, error)
  }
}
