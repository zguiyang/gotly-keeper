import path from 'node:path'

import { beforeEach, describe, expect, it } from 'vitest'

import { TEMPLATES_DIR } from '@/server/lib/config/path'
import { TemplateMissingVariablesError } from '@/server/lib/prompt-template'
import {
  clearTemplateCache,
  resolveTemplatePath,
} from '@/server/lib/prompt-template/template-loader'
import { renderTemplate } from '@/server/lib/prompt-template/template-renderer'
import {
  renderPrompt,
} from '@/server/lib/prompt-template/template-service'

describe('prompt-template', () => {
  beforeEach(() => {
    clearTemplateCache()
  })

  it('resolves slash+dot template ids to existing md files', () => {
    const templatePath = resolveTemplatePath('workspace/note-summary.system')

    expect(templatePath).toBe(
      path.resolve(TEMPLATES_DIR, 'workspace/note-summary.system.md')
    )
  })

  it('renders prompt from markdown template files', async () => {
    const rendered = await renderPrompt('workspace/note-summary.user', {
      payloadJson: '{"ok":true}',
    })

    expect(rendered).toContain('{"ok":true}')
  })

  it('supports strict nested variables with dot path', () => {
    const output = renderTemplate(
      'demo',
      'Hello {{user.name}}',
      { user: { name: 'Gotly' } },
      true
    )

    expect(output).toBe('Hello Gotly')
  })

  it('throws strict missing nested variable errors', () => {
    expect(() =>
      renderTemplate('demo', 'Hello {{user.name}}', { user: {} }, true)
    ).toThrow(TemplateMissingVariablesError)
  })
})
