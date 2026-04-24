// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { NotesClient } from '@/components/workspace/notes-client'

import type { AssetListItem } from '@/shared/assets/assets.types'
import type { PaginatedResult } from '@/shared/pagination'

function createNote(overrides: Partial<AssetListItem> = {}): AssetListItem {
  return {
    id: 'note_1',
    originalText: '## 会议\n\n- 确认范围',
    title: '不会展示的标题',
    excerpt: '不会展示的摘要',
    type: 'note',
    content: '## 会议\n\n- 确认范围',
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

afterEach(() => {
  cleanup()
})

describe('NotesClient', () => {
  it('默认渲染 markdown 内容，只保留内容和时间信息', () => {
    render(
      <NotesClient
        initialPage={createPage([
          createNote(),
        ])}
      />
    )

    expect(screen.getByRole('heading', { name: '会议' })).toBeTruthy()
    expect(screen.getByRole('list')).toBeTruthy()
    expect(screen.queryByText('不会展示的标题')).toBeNull()
    expect(screen.queryByText('不会展示的摘要')).toBeNull()
    expect(screen.getByText(/更新于/)).toBeTruthy()
    expect(screen.queryByText(/创建于/)).toBeNull()
    expect(screen.queryByLabelText('更多操作')).toBeNull()
  })

  it('点击卡片后进入原地编辑态，并且同一时间只允许一张卡片编辑', async () => {
    const user = userEvent.setup()

    render(
      <NotesClient
        initialPage={createPage([
          createNote({ id: 'note_1', content: '第一条' }),
          createNote({ id: 'note_2', content: '第二条', originalText: '第二条', title: '第二条' }),
        ])}
      />
    )

    await user.click(screen.getByText('第一条'))

    const editor = screen.getByRole('textbox', { name: '编辑笔记' })
    expect(editor).toBeTruthy()
    expect(editor.textContent).toContain('第一条')
    const editingCard = editor.closest('article')
    expect(editingCard).toBeTruthy()
    expect(within(editingCard as HTMLElement).queryByText(/更新于/)).toBeNull()

    await user.click(screen.getByText('第二条'))

    expect(screen.queryAllByRole('textbox', { name: '编辑笔记' })).toHaveLength(0)

    await user.click(screen.getByText('第二条'))

    expect(screen.getAllByRole('textbox', { name: '编辑笔记' })).toHaveLength(1)
    expect(screen.getByRole('textbox', { name: '编辑笔记' }).textContent).toContain('第二条')
  })
})
