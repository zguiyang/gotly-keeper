import { describe, it, expect } from 'vitest'

import { toAssetListItem } from '@/server/services/assets/assets.mapper'

import type { Asset } from '@/server/lib/db/schema'

describe('assets.mapper', () => {
  describe('toAssetListItem', () => {
    it('transforms Asset to AssetListItem correctly', () => {
      const asset: Asset = {
        id: 'test-id',
        userId: 'user-1',
        originalText: '测试资产文本内容',
        type: 'note',
        url: null,
        timeText: '今天',
        dueAt: new Date('2026-04-20'),
        completedAt: null,
        bookmarkMeta: null,
        createdAt: new Date('2026-04-15'),
        updatedAt: new Date('2026-04-15'),
      }

      const result = toAssetListItem(asset)

      expect(result.id).toBe('test-id')
      expect(result.originalText).toBe('测试资产文本内容')
      expect(result.title).toBe('测试资产文本内容'.slice(0, 32))
      expect(result.excerpt).toBe('测试资产文本内容')
      expect(result.type).toBe('note')
      expect(result.url).toBe(null)
      expect(result.timeText).toBe('今天')
      expect(result.dueAt).toEqual(new Date('2026-04-20'))
      expect(result.completed).toBe(false)
      expect(result.createdAt).toEqual(new Date('2026-04-15'))
    })

    it('marks completed todos correctly', () => {
      const asset: Asset = {
        id: 'test-id',
        userId: 'user-1',
        originalText: '已完成的任务',
        type: 'todo',
        url: null,
        timeText: null,
        dueAt: null,
        completedAt: new Date('2026-04-14'),
        bookmarkMeta: null,
        createdAt: new Date('2026-04-13'),
        updatedAt: new Date('2026-04-14'),
      }

      const result = toAssetListItem(asset)

      expect(result.completed).toBe(true)
    })

    it('handles link type assets', () => {
      const asset: Asset = {
        id: 'link-id',
        userId: 'user-1',
        originalText: 'GitHub',
        type: 'link',
        url: 'https://github.com',
        timeText: null,
        dueAt: null,
        completedAt: null,
        bookmarkMeta: null,
        createdAt: new Date('2026-04-15'),
        updatedAt: new Date('2026-04-15'),
      }

      const result = toAssetListItem(asset)

      expect(result.type).toBe('link')
      expect(result.url).toBe('https://github.com')
    })
  })
})
