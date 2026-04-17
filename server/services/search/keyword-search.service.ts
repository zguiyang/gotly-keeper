import 'server-only'

import { and, desc, eq, sql, type SQL } from 'drizzle-orm'

import {
  ASSET_LIST_LIMIT_MIN,
  ASSET_LIST_LIMIT_MAX,
} from '@/server/lib/config/constants'
import { db } from '@/server/lib/db'
import { bookmarks, notes, todos } from '@/server/lib/db/schema'


import { scoreAssetForQuery } from './search.query-parser'

import type { KeywordCandidate, SearchAssetsOptions } from './search.types'
import type { AssetListItem } from '@/shared/assets/assets.types'

type KeywordSearchOptions = Omit<SearchAssetsOptions, 'query' | 'timeHint'> & {
  terms: string[]
  timeRangeHint?: { startsAt: Date; endsAt: Date } | null
}

export async function searchByKeyword({
  userId,
  terms,
  typeHint,
  completionHint,
  timeRangeHint,
  limit = 100,
}: KeywordSearchOptions): Promise<KeywordCandidate[]> {
  const clampedLimit = Math.min(Math.max(limit, ASSET_LIST_LIMIT_MIN), ASSET_LIST_LIMIT_MAX)
  const includeNotes = (!typeHint || typeHint === 'note') && completionHint !== 'complete'
  const includeBookmarks = (!typeHint || typeHint === 'link') && completionHint !== 'complete'
  const includeTodos = !typeHint || typeHint === 'todo'

  const tasks: Array<Promise<AssetListItem[]>> = []

  if (includeNotes) {
    tasks.push(
      db
        .select()
        .from(notes)
        .where(eq(notes.userId, userId))
        .orderBy(desc(notes.createdAt))
        .limit(clampedLimit)
        .then((rows) =>
          rows.map((note) => ({
            id: note.id,
            originalText: note.originalText,
            title: note.originalText.slice(0, 32),
            excerpt: note.originalText,
            type: 'note',
            url: null,
            timeText: null,
            dueAt: null,
            completed: false,
            createdAt: note.createdAt,
          }))
        )
    )
  }

  if (includeBookmarks) {
    tasks.push(
      db
        .select()
        .from(bookmarks)
        .where(eq(bookmarks.userId, userId))
        .orderBy(desc(bookmarks.createdAt))
        .limit(clampedLimit)
        .then((rows) =>
          rows.map((bookmark) => ({
            id: bookmark.id,
            originalText: bookmark.originalText,
            title: bookmark.bookmarkMeta?.title ?? bookmark.originalText.slice(0, 32),
            excerpt:
              bookmark.bookmarkMeta?.description ??
              bookmark.bookmarkMeta?.contentSummary ??
              bookmark.originalText,
            type: 'link',
            url: bookmark.url ?? null,
            timeText: null,
            dueAt: null,
            completed: false,
            bookmarkMeta: bookmark.bookmarkMeta ?? null,
            createdAt: bookmark.createdAt,
          }))
        )
    )
  }

  if (includeTodos) {
    const todoConditions: SQL[] = [eq(todos.userId, userId)]

    if (completionHint === 'complete') {
      todoConditions.push(sql`${todos.completedAt} is not null`)
    }

    if (completionHint === 'incomplete') {
      todoConditions.push(sql`${todos.completedAt} is null`)
    }

    if (timeRangeHint && typeHint === 'todo') {
      const { startsAt, endsAt } = timeRangeHint
      todoConditions.push(
        and(
          sql`${todos.dueAt} >= ${startsAt}`,
          sql`${todos.dueAt} < ${endsAt}`
        ) as SQL
      )
    }

    tasks.push(
      db
        .select()
        .from(todos)
        .where(and(...todoConditions))
        .orderBy(desc(todos.createdAt))
        .limit(clampedLimit)
        .then((rows) =>
          rows.map((todo) => ({
            id: todo.id,
            originalText: todo.originalText,
            title: todo.originalText.slice(0, 32),
            excerpt: todo.originalText,
            type: 'todo',
            url: null,
            timeText: todo.timeText,
            dueAt: todo.dueAt,
            completed: todo.completedAt !== null,
            createdAt: todo.createdAt,
          }))
        )
    )
  }

  const results = (await Promise.all(tasks))
    .flat()
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, clampedLimit)

  return results
    .map((asset) => ({
      asset,
      score: scoreAssetForQuery(asset, '', terms),
    }))
    .filter((candidate) => candidate.score > 0)
}
