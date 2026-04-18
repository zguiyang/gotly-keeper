import type { Asset, NewAsset } from '@/server/db/schema'

export interface AssetFactoryOptions {
  id?: string
  userId?: string
  originalText?: string
  type?: 'note' | 'link' | 'todo'
  url?: string
  timeText?: string
  dueAt?: Date
  completedAt?: Date
  createdAt?: Date
  updatedAt?: Date
}

export function createAssetFixture(options: AssetFactoryOptions = {}): Asset {
  const now = new Date()
  return {
    id: options.id ?? 'asset-test-id',
    userId: options.userId ?? 'user-test-id',
    originalText: options.originalText ?? 'Test asset content',
    type: options.type ?? 'note',
    url: options.url ?? null,
    timeText: options.timeText ?? null,
    dueAt: options.dueAt ?? null,
    completedAt: options.completedAt ?? null,
    createdAt: options.createdAt ?? now,
    updatedAt: options.updatedAt ?? now,
  }
}

export function createNewAssetFixture(options: AssetFactoryOptions = {}): NewAsset {
  const now = new Date()
  return {
    id: options.id ?? 'asset-test-id',
    userId: options.userId ?? 'user-test-id',
    originalText: options.originalText ?? 'Test asset content',
    type: options.type ?? 'note',
    url: options.url ?? null,
    timeText: options.timeText ?? null,
    dueAt: options.dueAt ?? null,
    completedAt: options.completedAt ?? null,
    createdAt: options.createdAt ?? now,
    updatedAt: options.updatedAt ?? now,
  }
}

export const assetFixtures = {
  note: () => createAssetFixture({ type: 'note', originalText: 'A test note' }),
  link: () => createAssetFixture({ type: 'link', url: 'https://example.com', originalText: 'Example link' }),
  todo: () => createAssetFixture({ type: 'todo', originalText: 'A test todo', completedAt: undefined }),
  completedTodo: () => createAssetFixture({ type: 'todo', originalText: 'Completed todo', completedAt: new Date() }),
}
