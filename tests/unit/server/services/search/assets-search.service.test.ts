import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { searchAssets } from '@/server/services/search/assets-search.service'
import * as semanticSearch from '@/server/services/search/semantic-search.service'
import * as keywordSearch from '@/server/services/search/keyword-search.service'
import * as searchRanker from '@/server/services/search/search.ranker'
import type { AssetListItem } from '@/shared/assets/assets.types'
import type { Asset } from '@/server/lib/db/schema'
import type { SemanticCandidate } from '@/server/services/search/search.types'

vi.mock('@/server/services/search/semantic-search.service')
vi.mock('@/server/services/search/keyword-search.service')
vi.mock('@/server/services/search/search.ranker')
vi.mock('@/server/services/search/search.logging', () => ({
  logSearchPath: vi.fn(),
}))

const now = new Date('2026-04-15T10:00:00.000Z')

const makeSemanticAsset = (overrides: Partial<Asset> = {}): SemanticCandidate => ({
  asset: {
    id: 'asset-1',
    userId: 'user1',
    originalText: '测试内容',
    type: 'note',
    url: null,
    timeText: null,
    dueAt: null,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  },
  distance: 0.1,
})

const makeAsset = (overrides: Partial<AssetListItem> = {}): AssetListItem => ({
  id: 'asset-1',
  originalText: '测试内容',
  title: '测试标题',
  excerpt: '测试摘要',
  type: 'todo',
  url: null,
  timeText: null,
  dueAt: null,
  completed: false,
  createdAt: new Date('2026-04-15T10:00:00.000Z'),
  ...overrides,
})

describe('assets-search.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns empty array for empty query', async () => {
    const result = await searchAssets({ userId: 'user1', query: '' })
    expect(result).toEqual([])
  })

  it('returns empty array for whitespace-only query', async () => {
    const result = await searchAssets({ userId: 'user1', query: '   ' })
    expect(result).toEqual([])
  })

  it('uses keyword fallback when semantic search throws', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    vi.mocked(semanticSearch.searchByEmbedding).mockRejectedValue(new Error('embedding failed'))
    vi.mocked(keywordSearch.searchByKeyword).mockResolvedValue([])
    vi.mocked(searchRanker.mergeSearchResults).mockReturnValue([])

    await searchAssets({ userId: 'user1', query: '测试查询' })

    expect(semanticSearch.searchByEmbedding).toHaveBeenCalled()
    expect(keywordSearch.searchByKeyword).toHaveBeenCalled()
    expect(warnSpy).toHaveBeenCalledWith(
      '[search] Semantic search failed; using keyword fallback',
      expect.objectContaining({ error: 'embedding failed' })
    )
    warnSpy.mockRestore()
  })

  it('applies timeFilter when typeHint is todo and timeHint is provided', async () => {
    const mockAsset = makeAsset({
      id: 'todo-1',
      type: 'todo',
      timeText: '今天',
      dueAt: new Date('2026-04-15T09:00:00+08:00'),
    })

    vi.mocked(semanticSearch.searchByEmbedding).mockResolvedValue([
      makeSemanticAsset({
        id: 'todo-1',
        type: 'todo',
        timeText: '今天',
        dueAt: new Date('2026-04-15T09:00:00+08:00'),
      }),
    ])
    vi.mocked(keywordSearch.searchByKeyword).mockResolvedValue([])
    vi.mocked(searchRanker.mergeSearchResults).mockReturnValue([
      { asset: mockAsset, score: 10, source: 'semantic' as const },
    ])

    const result = await searchAssets({
      userId: 'user1',
      query: '测试',
      typeHint: 'todo',
      timeHint: '今天',
    })

    expect(result.length).toBe(1)
    expect(result[0].id).toBe('todo-1')
  })

  it('filters out assets outside time range when timeFilter is applied', async () => {
    const insideRange = makeAsset({
      id: 'todo-in',
      type: 'todo',
      timeText: '今天',
      dueAt: new Date('2026-04-15T09:00:00+08:00'),
    })

    vi.mocked(semanticSearch.searchByEmbedding).mockResolvedValue([
      makeSemanticAsset({
        id: 'todo-in',
        type: 'todo',
        timeText: '今天',
        dueAt: new Date('2026-04-15T09:00:00+08:00'),
      }),
      makeSemanticAsset({
        id: 'todo-out',
        type: 'todo',
        timeText: null,
        dueAt: new Date('2026-04-20T09:00:00+08:00'),
      }),
    ])
    vi.mocked(keywordSearch.searchByKeyword).mockResolvedValue([])
    vi.mocked(searchRanker.mergeSearchResults).mockReturnValue([
      { asset: insideRange, score: 10, source: 'semantic' as const },
    ])

    const result = await searchAssets({
      userId: 'user1',
      query: '测试',
      typeHint: 'todo',
      timeHint: '今天',
    })

    expect(result.length).toBe(1)
    expect(result[0].id).toBe('todo-in')
  })

  it('does not apply timeFilter when typeHint is not todo', async () => {
    const mockAsset = makeAsset({
      id: 'note-1',
      type: 'note',
    })

    vi.mocked(semanticSearch.searchByEmbedding).mockResolvedValue([
      makeSemanticAsset({ id: 'note-1', type: 'note' }),
    ])
    vi.mocked(keywordSearch.searchByKeyword).mockResolvedValue([])
    vi.mocked(searchRanker.mergeSearchResults).mockReturnValue([
      { asset: mockAsset, score: 10, source: 'semantic' as const },
    ])

    const result = await searchAssets({
      userId: 'user1',
      query: '测试',
      typeHint: 'note',
      timeHint: '今天',
    })

    expect(result.length).toBe(1)
    const semanticCall = vi.mocked(semanticSearch.searchByEmbedding).mock.calls[0][0]
    expect(semanticCall.limit).toBeDefined()
  })

  it('calls mergeSearchResults with semantic and keyword candidates', async () => {
    const semanticAsset = makeAsset({ id: 'sem-1', type: 'note' })
    const keywordAsset = makeAsset({ id: 'kw-1', type: 'note' })

    vi.mocked(semanticSearch.searchByEmbedding).mockResolvedValue([
      makeSemanticAsset({ id: 'sem-1', type: 'note' }),
    ])
    vi.mocked(keywordSearch.searchByKeyword).mockResolvedValue([
      { asset: keywordAsset, score: 10 },
    ])
    vi.mocked(searchRanker.mergeSearchResults).mockReturnValue([
      { asset: semanticAsset, score: 10, source: 'semantic' as const },
      { asset: keywordAsset, score: 8, source: 'keyword' as const },
    ])

    await searchAssets({ userId: 'user1', query: '测试' })

    expect(searchRanker.mergeSearchResults).toHaveBeenCalledWith(
      expect.any(Array),
      expect.any(Array),
      expect.any(Number)
    )
  })

  it('respects limit parameter', async () => {
    vi.mocked(semanticSearch.searchByEmbedding).mockResolvedValue([])
    vi.mocked(keywordSearch.searchByKeyword).mockResolvedValue([])
    vi.mocked(searchRanker.mergeSearchResults).mockReturnValue([])

    await searchAssets({ userId: 'user1', query: '测试', limit: 5 })

    const semanticCall = vi.mocked(semanticSearch.searchByEmbedding).mock.calls[0][0]
    expect(semanticCall.limit).toBe(5)
  })
})
