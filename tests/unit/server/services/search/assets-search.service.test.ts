import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { searchAssets } from '@/server/services/search/assets-search.service'
import * as keywordSearch from '@/server/services/search/keyword-search.service'
import * as searchRanker from '@/server/services/search/search.ranker'
import * as semanticSearch from '@/server/services/search/semantic-search.service'

import type { SemanticCandidate } from '@/server/services/search/search.types'
import type { AssetListItem } from '@/shared/assets/assets.types'

vi.mock('@/server/services/search/semantic-search.service')
vi.mock('@/server/services/search/keyword-search.service')
vi.mock('@/server/services/search/search.ranker')
vi.mock('@/server/services/search/search.logging', () => ({
  logSearchPath: vi.fn(),
}))

const now = new Date('2026-04-15T10:00:00.000Z')

const makeSemanticAsset = (overrides: Partial<AssetListItem> = {}): SemanticCandidate => ({
  asset: {
    id: 'asset-1',
    originalText: '测试内容',
    title: '测试标题',
    excerpt: '测试摘要',
    type: 'note',
    url: null,
    timeText: null,
    dueAt: null,
    completed: false,
    bookmarkMeta: null,
    createdAt: now,
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
  bookmarkMeta: null,
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

  it('applies exact agent time range for todo search', async () => {
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
      timeFilter: {
        kind: 'exact_range',
        phrase: '今天',
        startIso: '2026-04-14T16:00:00.000Z',
        endIso: '2026-04-15T16:00:00.000Z',
        basis: '今天 = anchor day',
      },
    })

    expect(result.length).toBe(1)
    expect(result[0].id).toBe('todo-1')
  })

  it('filters out assets outside exact time range', async () => {
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
      timeFilter: {
        kind: 'exact_range',
        phrase: '今天',
        startIso: '2026-04-14T16:00:00.000Z',
        endIso: '2026-04-15T16:00:00.000Z',
        basis: '今天 = anchor day',
      },
    })

    expect(result.length).toBe(1)
    expect(result[0].id).toBe('todo-in')
  })

  it('applies exact agent time range without parsing natural language', async () => {
    const insideRange = makeAsset({
      id: 'note-in',
      type: 'note',
      createdAt: new Date('2026-04-15T02:00:00.000Z'),
    })

    vi.mocked(semanticSearch.searchByEmbedding).mockResolvedValue([
      makeSemanticAsset({
        id: 'note-in',
        type: 'note',
        createdAt: new Date('2026-04-15T02:00:00.000Z'),
      }),
      makeSemanticAsset({
        id: 'note-out',
        type: 'note',
        createdAt: new Date('2026-04-18T02:00:00.000Z'),
      }),
    ])
    vi.mocked(keywordSearch.searchByKeyword).mockResolvedValue([])
    vi.mocked(searchRanker.mergeSearchResults).mockReturnValue([
      { asset: insideRange, score: 10, source: 'semantic' as const },
    ])

    const result = await searchAssets({
      userId: 'user1',
      query: '测试',
      typeHint: 'note',
      timeFilter: {
        kind: 'exact_range',
        phrase: '今天',
        startIso: '2026-04-14T16:00:00.000Z',
        endIso: '2026-04-15T16:00:00.000Z',
        basis: '今天 = anchor day',
      },
    })

    expect(result.length).toBe(1)
    expect(result[0].id).toBe('note-in')
    const keywordCall = vi.mocked(keywordSearch.searchByKeyword).mock.calls[0][0]
    expect(keywordCall.timeRangeHint).toEqual({
      startsAt: new Date('2026-04-14T16:00:00.000Z'),
      endsAt: new Date('2026-04-15T16:00:00.000Z'),
    })
  })

  it('does not convert vague agent time filters into hidden date ranges', async () => {
    vi.mocked(semanticSearch.searchByEmbedding).mockResolvedValue([])
    vi.mocked(keywordSearch.searchByKeyword).mockResolvedValue([])
    vi.mocked(searchRanker.mergeSearchResults).mockReturnValue([])

    await searchAssets({
      userId: 'user1',
      query: '收藏的文章',
      typeHint: 'link',
      timeFilter: {
        kind: 'vague',
        phrase: '最近',
        reason: '最近没有固定数学边界',
      },
    })

    const keywordCall = vi.mocked(keywordSearch.searchByKeyword).mock.calls[0][0]
    expect(keywordCall.timeRangeHint).toBeNull()
  })

  it('passes cleaned Chinese search terms to keyword search', async () => {
    vi.mocked(semanticSearch.searchByEmbedding).mockResolvedValue([])
    vi.mocked(keywordSearch.searchByKeyword).mockResolvedValue([])
    vi.mocked(searchRanker.mergeSearchResults).mockReturnValue([])

    await searchAssets({
      userId: 'user1',
      query: '我保存过木曜日咖啡的竞品参考链接吗',
      typeHint: 'link',
    })

    const keywordCall = vi.mocked(keywordSearch.searchByKeyword).mock.calls[0][0]
    expect(keywordCall.terms).toEqual(['木曜日咖啡', '竞品参考链接'])
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
