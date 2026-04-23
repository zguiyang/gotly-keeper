import { describe, expect, it } from 'vitest'

import {
  clampPageSize,
  createCursorPage,
  decodeCursor,
  encodeCursor,
} from '@/server/services/pagination'

describe('pagination', () => {
  it('encodes and decodes cursor payloads', () => {
    const cursor = encodeCursor({
      createdAt: '2026-04-23T10:00:00.000Z',
      id: 'note_1',
    })

    expect(decodeCursor(cursor)).toEqual({
      createdAt: '2026-04-23T10:00:00.000Z',
      id: 'note_1',
    })
  })

  it('throws on malformed cursor input', () => {
    expect(() => decodeCursor('not-a-cursor')).toThrow('INVALID_CURSOR')
  })

  it('clamps page size to the configured bounds', () => {
    expect(clampPageSize(-5, 1, 50)).toBe(1)
    expect(clampPageSize(20, 1, 50)).toBe(20)
    expect(clampPageSize(500, 1, 50)).toBe(50)
  })

  it('creates a paginated result with nextCursor when rows exceed pageSize', () => {
    const result = createCursorPage({
      rows: [
        { id: 'item_1', createdAt: new Date('2026-04-23T10:00:00.000Z') },
        { id: 'item_2', createdAt: new Date('2026-04-22T10:00:00.000Z') },
        { id: 'item_3', createdAt: new Date('2026-04-21T10:00:00.000Z') },
      ],
      pageSize: 2,
      getCursorPayload: (item) => ({
        createdAt: item.createdAt.toISOString(),
        id: item.id,
      }),
    })

    expect(result.items).toHaveLength(2)
    expect(result.pageInfo).toEqual({
      pageSize: 2,
      nextCursor: encodeCursor({
        createdAt: '2026-04-22T10:00:00.000Z',
        id: 'item_2',
      }),
      hasNextPage: true,
    })
  })
})
