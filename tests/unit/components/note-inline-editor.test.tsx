// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { NoteInlineEditor } from '@/components/workspace/note-inline-editor'

afterEach(() => {
  cleanup()
})

describe('NoteInlineEditor', () => {
  it('从 markdown 导入为所见即所得内容，而不是源码文本', () => {
    render(
      <NoteInlineEditor
        markdown={'**加粗内容**'}
        ariaLabel="编辑笔记"
        onMarkdownChange={vi.fn()}
        onBlur={vi.fn()}
        onSubmitShortcut={vi.fn()}
      />
    )

    const editor = screen.getByRole('textbox', { name: '编辑笔记' })
    expect(editor.querySelector('strong')).not.toBeNull()
    expect(editor.textContent).not.toContain('**加粗内容**')
  })

  it('支持 Cmd/Ctrl+Enter 快捷保存', () => {
    const onSubmitShortcut = vi.fn()

    render(
      <NoteInlineEditor
        markdown={'待保存内容'}
        ariaLabel="编辑笔记"
        onMarkdownChange={vi.fn()}
        onBlur={vi.fn()}
        onSubmitShortcut={onSubmitShortcut}
      />
    )

    const editor = screen.getByRole('textbox', { name: '编辑笔记' })
    fireEvent.keyDown(editor, { key: 'Enter', metaKey: true })

    expect(onSubmitShortcut).toHaveBeenCalledTimes(1)
  })
})
