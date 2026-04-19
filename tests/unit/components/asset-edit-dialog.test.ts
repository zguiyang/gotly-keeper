import { describe, expect, it } from 'vitest'

import {
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
      })
    ).toEqual({
      rawInput: '旧标题\n\n完整正文仍在数据库里',
      title: '新标题',
    })
  })
})
