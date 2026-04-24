import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { NotesClient } from '@/components/workspace/notes-client'
import type { AssetListItem } from '@/shared/assets/assets.types'
import type { PaginatedResult } from '@/shared/pagination'

function createNote(overrides: Partial<AssetListItem> = {}): AssetListItem {
  return {
    id: 'note_1',
    originalText: '记一下任务5浏览器验证 plain note 你好',
    title: '记一下任务5浏览器验证 plain note 你好',
    excerpt: '你好',
    type: 'note',
    content: '你好',
    summary: null,
    url: null,
    timeText: null,
    dueAt: null,
    completed: false,
    createdAt: new Date('2026-04-19T00:00:00.000Z'),
    updatedAt: new Date('2026-04-19T00:00:00.000Z'),
    ...overrides,
  }
}

function createPage(items: AssetListItem[]): PaginatedResult<AssetListItem> {
  return {
    items,
    pageInfo: {
      pageSize: items.length,
      nextCursor: null,
      hasNextPage: false,
    },
  }
}

describe('NotesClient display', () => {
  it('does not render generated fallback title for plain notes', () => {
    const html = renderToStaticMarkup(
      <NotesClient
        initialPage={createPage([
          createNote(),
        ])}
      />
    )

    expect(html).toContain('你好')
    expect(html).not.toContain('记一下任务5浏览器验证 plain note 你好</h3>')
  })

  it('renders structured title separately from body content', () => {
    const html = renderToStaticMarkup(
      <NotesClient
        initialPage={createPage([
          createNote({
            title: '任务 5 浏览器验证',
            content: '你好',
            excerpt: '你好',
          }),
        ])}
      />
    )

    expect(html).toContain('任务 5 浏览器验证</h3>')
    expect(html).toContain('你好</p>')
  })
})
