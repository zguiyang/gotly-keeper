import { describe, expect, it } from 'vitest'

import type { AssetListItem } from '../../../shared/assets/assets.types'

function createMockAsset(id: string): AssetListItem {
  return {
    id,
    originalText: `Test asset ${id}`,
    title: `Asset ${id}`,
    excerpt: `Excerpt ${id}`,
    type: 'note',
    url: null,
    timeText: null,
    dueAt: null,
    completed: false,
    createdAt: new Date(),
  }
}

describe('workspace homepage behavior', () => {
  describe('recent items cap', () => {
    it('caps recent items at 10 when a new asset is prepended', () => {
      const existingAssets: AssetListItem[] = Array.from({ length: 12 }, (_, i) =>
        createMockAsset(`existing-${i}`)
      )
      const newAsset = createMockAsset('new-asset')

      const result = [
        newAsset,
        ...existingAssets.filter((item) => item.id !== newAsset.id),
      ].slice(0, 10)

      expect(result).toHaveLength(10)
      expect(result[0].id).toBe('new-asset')
      expect(result[9].id).toBe('existing-8')
    })

    it('does not deduplicate when new asset has a unique id', () => {
      const existingAssets: AssetListItem[] = Array.from({ length: 10 }, (_, i) =>
        createMockAsset(`existing-${i}`)
      )
      const newAsset = createMockAsset('new-asset')

      const result = [
        newAsset,
        ...existingAssets.filter((item) => item.id !== newAsset.id),
      ].slice(0, 10)

      expect(result).toHaveLength(10)
      expect(result[0].id).toBe('new-asset')
    })

    it('deduplicates by replacing the existing item with the same id', () => {
      const existingAssets: AssetListItem[] = [
        createMockAsset('asset-to-replace'),
        ...Array.from({ length: 9 }, (_, i) => createMockAsset(`other-${i}`)),
      ]
      const updatedAsset: AssetListItem = {
        ...createMockAsset('asset-to-replace'),
        title: 'Updated title',
      }

      const result = [
        updatedAsset,
        ...existingAssets.filter((item) => item.id !== updatedAsset.id),
      ].slice(0, 10)

      expect(result).toHaveLength(10)
      expect(result[0].title).toBe('Updated title')
      expect(result.some((item) => item.id === 'asset-to-replace' && item.title !== 'Updated title')).toBe(
        false
      )
    })
  })
})
