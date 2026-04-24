// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  AssetEditDialog,
  buildAssetEditValues,
  getAssetEditInitialState,
} from '@/components/workspace/asset-edit-dialog'

import type { AssetListItem } from '@/shared/assets/assets.types'

function createAsset(overrides: Partial<AssetListItem> = {}): AssetListItem {
  return {
    id: 'asset_1',
    originalText: '原始正文内容',
    title: '默认标题',
    excerpt: '这是摘要，不是真实正文',
    type: 'note',
    url: null,
    timeText: null,
    dueAt: null,
    completed: false,
    createdAt: new Date('2026-04-19T00:00:00.000Z'),
    ...overrides,
  }
}

afterEach(() => {
  cleanup()
})

describe('asset edit dialog helpers', () => {
  it('does not use excerpt as editable content fallback', () => {
    const asset = createAsset({
      type: 'note',
      title: '会议纪要',
      excerpt: '这是摘要，不应该进正文输入框',
    })

    expect(getAssetEditInitialState(asset)).toEqual({
      title: '会议纪要',
      content: '',
      url: '',
      timeText: '',
      dueAt: null,
    })
  })

  it('skips submission when the user did not change anything', () => {
    const asset = createAsset({
      type: 'note',
      title: '会议纪要',
    })

    expect(
      buildAssetEditValues(asset, {
        title: '会议纪要',
        content: '',
        url: '',
        timeText: '',
        dueAt: null,
      })
    ).toBeNull()
  })

  it('preserves original raw text when title changes without real structured body', () => {
    const asset = createAsset({
      type: 'note',
      title: '旧标题',
      originalText: '旧标题\n\n完整正文仍在数据库里',
    })

    expect(
      buildAssetEditValues(asset, {
        title: '新标题',
        content: '',
        url: '',
        timeText: '',
        dueAt: null,
      })
    ).toEqual({
      rawInput: '旧标题\n\n完整正文仍在数据库里',
      title: '新标题',
    })
  })

  it('preserves structured dueAt when todo time text changes', () => {
    const dueAt = new Date('2026-04-24T09:30:00.000Z')
    const asset = createAsset({
      type: 'todo',
      title: '跟进合同',
      content: '联系法务',
      originalText: '跟进合同\n联系法务\n明早 9:30',
      timeText: '明早 9:30',
      dueAt,
    })

    expect(
      buildAssetEditValues(asset, {
        title: '跟进合同',
        content: '联系法务',
        url: '',
        timeText: '明天上午',
        dueAt,
      })
    ).toEqual({
      rawInput: '跟进合同\n联系法务\n明天上午',
      timeText: '明天上午',
      dueAt,
    })
  })

  it('keeps structured dueAt when only todo time text is emptied', () => {
    const dueAt = new Date('2026-04-24T09:30:00.000Z')
    const asset = createAsset({
      type: 'todo',
      title: '跟进合同',
      content: '联系法务',
      originalText: '跟进合同\n联系法务\n明早 9:30',
      timeText: '明早 9:30',
      dueAt,
    })

    expect(
      buildAssetEditValues(asset, {
        title: '跟进合同',
        content: '联系法务',
        url: '',
        timeText: '',
        dueAt,
      })
    ).toEqual({
      rawInput: '跟进合同\n联系法务',
      timeText: null,
      dueAt,
    })
  })

  it('updates structured dueAt when datetime changes without time text edits', () => {
    const initialDueAt = new Date('2026-04-24T09:30:00.000Z')
    const nextDueAt = new Date('2026-04-25T14:45:00.000Z')
    const asset = createAsset({
      type: 'todo',
      title: '跟进合同',
      content: '联系法务',
      originalText: '跟进合同\n联系法务\n明早 9:30',
      timeText: '明早 9:30',
      dueAt: initialDueAt,
    })

    expect(
      buildAssetEditValues(asset, {
        title: '跟进合同',
        content: '联系法务',
        url: '',
        timeText: '明早 9:30',
        dueAt: nextDueAt,
      })
    ).toEqual({
      rawInput: '跟进合同\n联系法务\n明早 9:30',
      dueAt: nextDueAt,
    })
  })

  it('allows sparse todo payloads when only the title changes', () => {
    const asset = createAsset({
      type: 'todo',
      title: '跟进合同',
      content: '联系法务',
      originalText: '跟进合同\n联系法务',
    })

    expect(
      buildAssetEditValues(asset, {
        title: '今天跟进合同',
        content: '联系法务',
        url: '',
        timeText: '',
        dueAt: null,
      })
    ).toEqual({
      rawInput: '今天跟进合同\n联系法务',
      title: '今天跟进合同',
    })
  })

  it('clears dueAt and timeText when structured datetime is removed', () => {
    const dueAt = new Date('2026-04-24T09:30:00.000Z')
    const asset = createAsset({
      type: 'todo',
      title: '跟进合同',
      content: '联系法务',
      originalText: '跟进合同\n联系法务\n明早 9:30',
      timeText: '明早 9:30',
      dueAt,
    })

    expect(
      buildAssetEditValues(asset, {
        title: '跟进合同',
        content: '联系法务',
        url: '',
        timeText: '',
        dueAt: null,
      })
    ).toEqual({
      rawInput: '跟进合同\n联系法务',
      timeText: null,
      dueAt: null,
    })
  })

  it('keeps updated timeText when structured dueAt is cleared', () => {
    const dueAt = new Date('2026-04-24T09:30:00.000Z')
    const asset = createAsset({
      type: 'todo',
      title: '跟进合同',
      content: '联系法务',
      originalText: '跟进合同\n联系法务\n明早 9:30',
      timeText: '明早 9:30',
      dueAt,
    })

    expect(
      buildAssetEditValues(asset, {
        title: '跟进合同',
        content: '联系法务',
        url: '',
        timeText: '改成下周一上午',
        dueAt: null,
      })
    ).toEqual({
      rawInput: '跟进合同\n联系法务\n改成下周一上午',
      timeText: '改成下周一上午',
      dueAt: null,
    })
  })

  it('keeps dueAt-only todos unchanged when user does not edit time', () => {
    const dueAt = new Date('2026-04-24T09:30:00.000Z')
    const asset = createAsset({
      type: 'todo',
      title: '跟进合同',
      content: '联系法务',
      timeText: null,
      dueAt,
    })

    expect(getAssetEditInitialState(asset)).toEqual({
      title: '跟进合同',
      content: '联系法务',
      url: '',
      timeText: '',
      dueAt,
    })

    expect(
      buildAssetEditValues(asset, {
        title: '跟进合同',
        content: '联系法务',
        url: '',
        timeText: '',
        dueAt,
      })
    ).toBeNull()
  })
})

describe('AssetEditDialog interactions', () => {
  it('updates dueAt after selecting a calendar date and changing time', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(true)
    const onOpenChange = vi.fn()
    const asset = createAsset({
      type: 'todo',
      title: '跟进合同',
      content: '联系法务',
      originalText: '跟进合同\n联系法务\n明早 9:30',
      timeText: '明早 9:30',
      dueAt: new Date('2026-04-24T09:30:00.000Z'),
    })

    render(<AssetEditDialog asset={asset} onOpenChange={onOpenChange} onSubmit={onSubmit} />)

    await user.click(screen.getByRole('button', { name: '日期' }))

    const calendar = screen.getAllByRole('dialog').at(-1)!
    await user.click(within(calendar).getByRole('button', { name: /2026年4月25日/ }))

    const timeInput = screen.getByLabelText('时间')
    fireEvent.change(timeInput, { target: { value: '14:45' } })

    await user.click(screen.getByRole('button', { name: '保存' }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledWith(
      asset,
      expect.objectContaining({
        dueAt: new Date('2026-04-25T14:45:00.000Z'),
      })
    )
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('clears dueAt while preserving updated timeText', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(true)
    const asset = createAsset({
      type: 'todo',
      title: '跟进合同',
      content: '联系法务',
      originalText: '跟进合同\n联系法务\n明早 9:30',
      timeText: '明早 9:30',
      dueAt: new Date('2026-04-24T09:30:00.000Z'),
    })

    render(<AssetEditDialog asset={asset} onOpenChange={vi.fn()} onSubmit={onSubmit} />)

    const timeTextInput = screen.getByLabelText('时间说明（可选）')
    await user.clear(timeTextInput)
    await user.type(timeTextInput, '改成下周一上午')
    await user.click(screen.getByRole('button', { name: '清空日期时间' }))
    await user.click(screen.getByRole('button', { name: '保存' }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledWith(
      asset,
      expect.objectContaining({
        timeText: '改成下周一上午',
        dueAt: null,
      })
    )
  })
})
