import 'server-only'

import type { PageInfo, PaginatedResult } from '@/shared/pagination'

type CursorPayload = Record<string, unknown>

type CreateCursorPageOptions<Row, Cursor extends CursorPayload> = {
  rows: Row[]
  pageSize: number
  getCursorPayload: (row: Row) => Cursor
}

export function clampPageSize(pageSize: number, minPageSize = 1, maxPageSize = 100): number {
  return Math.min(Math.max(pageSize, minPageSize), maxPageSize)
}

export function encodeCursor<T extends CursorPayload>(payload: T): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
}

export function decodeCursor<T extends CursorPayload>(cursor: string | null | undefined): T | null {
  if (!cursor) {
    return null
  }

  try {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf8')
    const parsed = JSON.parse(decoded) as unknown

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('INVALID_CURSOR')
    }

    return parsed as T
  } catch {
    throw new Error('INVALID_CURSOR')
  }
}

export function createCursorPage<Row, Cursor extends CursorPayload>({
  rows,
  pageSize,
  getCursorPayload,
}: CreateCursorPageOptions<Row, Cursor>): PaginatedResult<Row> {
  const hasNextPage = rows.length > pageSize
  const items = hasNextPage ? rows.slice(0, pageSize) : rows
  const nextCursor = hasNextPage && items.length > 0 ? encodeCursor(getCursorPayload(items[items.length - 1])) : null

  return {
    items,
    pageInfo: {
      pageSize,
      nextCursor,
      hasNextPage,
    } satisfies PageInfo,
  }
}
