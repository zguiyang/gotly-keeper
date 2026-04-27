// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useNoteInlineEdit } from '@/hooks/workspace/use-note-inline-edit'

describe('useNoteInlineEdit', () => {
  it('无改动时不会保存', async () => {
    const onSave = vi.fn().mockResolvedValue(true)
    const { result } = renderHook(() =>
      useNoteInlineEdit({
        initialMarkdown: '原始内容',
        onSave,
        debounceMs: 200,
      })
    )

    await act(async () => {
      await result.current.saveNow()
    })

    expect(onSave).not.toHaveBeenCalled()
  })

  it('输入后会触发防抖保存', async () => {
    vi.useFakeTimers()
    const onSave = vi.fn().mockResolvedValue(true)
    const { result } = renderHook(() =>
      useNoteInlineEdit({
        initialMarkdown: '原始内容',
        onSave,
        debounceMs: 200,
      })
    )

    await act(async () => {
      result.current.setMarkdown('新的内容')
    })

    act(() => {
      vi.advanceTimersByTime(199)
    })

    expect(onSave).not.toHaveBeenCalled()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })

    expect(onSave).toHaveBeenCalledWith('新的内容')
    vi.useRealTimers()
  })

  it('保存失败时保留错误状态', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('保存失败'))
    const { result } = renderHook(() =>
      useNoteInlineEdit({
        initialMarkdown: '原始内容',
        onSave,
        debounceMs: 200,
      })
    )

    act(() => {
      result.current.setMarkdown('新的内容')
    })

    await act(async () => {
      await result.current.saveNow()
    })

    expect(result.current.status).toBe('error')
    expect(result.current.errorMessage).toBe('保存失败')
  })

  it('允许保存回调把无需更新视为成功', async () => {
    const onSave = vi.fn().mockResolvedValue(true)
    const { result } = renderHook(() =>
      useNoteInlineEdit({
        initialMarkdown: '原始内容',
        onSave,
        debounceMs: 200,
      })
    )

    act(() => {
      result.current.setMarkdown('规范化后的原始内容')
    })

    onSave.mockResolvedValueOnce(true)

    await act(async () => {
      await result.current.saveNow()
    })

    expect(result.current.status).toBe('saved')
    expect(result.current.errorMessage).toBeNull()
  })

  it('保存过程中继续编辑时会补保存最新内容', async () => {
    let resolveFirstSave: ((value: boolean) => void) | null = null
    const onSave = vi
      .fn<(markdown: string) => Promise<boolean>>()
      .mockImplementationOnce(
        (markdown) =>
          new Promise<boolean>((resolve) => {
            expect(markdown).toBe('第一版')
            resolveFirstSave = resolve
          })
      )
      .mockResolvedValueOnce(true)

    const { result } = renderHook(() =>
      useNoteInlineEdit({
        initialMarkdown: '原始内容',
        onSave,
        debounceMs: 200,
      })
    )

    act(() => {
      result.current.setMarkdown('第一版')
    })

    const firstSavePromise = act(async () => {
      await result.current.saveNow()
    })

    act(() => {
      result.current.setMarkdown('第二版')
    })

    await act(async () => {
      resolveFirstSave?.(true)
      await firstSavePromise
    })

    await act(async () => {
      await result.current.saveNow()
    })

    expect(onSave).toHaveBeenNthCalledWith(1, '第一版')
    expect(onSave).toHaveBeenNthCalledWith(2, '第二版')
    expect(result.current.status).toBe('saved')
  })
})
