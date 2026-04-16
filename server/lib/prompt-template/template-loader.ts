import fs from 'node:fs/promises'
import path from 'node:path'

import { TEMPLATES_DIR } from '@/server/lib/config/path'

import {
  TemplateNotFoundError,
  TemplateUnsafePathError,
} from './template-errors'

import type { TemplateCacheEntry } from './template.types'

const templateCache = new Map<string, TemplateCacheEntry>()

export function resolveTemplatePath(templateId: string): string {
  const normalized = templateId.includes('/')
    ? templateId
    : templateId.replace(/\./g, '/')
  const filePath = path.resolve(TEMPLATES_DIR, `${normalized}.md`)

  const relative = path.relative(TEMPLATES_DIR, filePath)
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new TemplateUnsafePathError(templateId, filePath)
  }

  return filePath
}

export async function loadTemplate(
  templateId: string,
  options?: { disableCache?: boolean }
): Promise<string> {
  const filePath = resolveTemplatePath(templateId)

  if (!options?.disableCache) {
    const cached = templateCache.get(templateId)
    if (cached) {
      try {
        const stat = await fs.stat(cached.filePath)
        if (stat.mtimeMs === cached.mtimeMs) {
          return cached.content
        }
      } catch {
        templateCache.delete(templateId)
      }
    }
  }

  let content: string
  try {
    content = await fs.readFile(filePath, 'utf-8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new TemplateNotFoundError(templateId)
    }
    throw error
  }

  try {
    const stat = await fs.stat(filePath)
    templateCache.set(templateId, {
      content,
      mtimeMs: stat.mtimeMs,
      filePath,
    })
  } catch {
    // ignore stat error
  }

  return content
}

export function clearTemplateCache(): void {
  templateCache.clear()
}
