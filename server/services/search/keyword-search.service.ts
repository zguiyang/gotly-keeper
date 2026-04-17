import 'server-only'

import { and, desc, eq, inArray, sql, type SQL } from 'drizzle-orm'

import {
  ASSET_LIST_LIMIT_MIN,
  ASSET_LIST_LIMIT_MAX,
} from '@/server/lib/config/constants'
import { db } from '@/server/lib/db'
import { bookmarks, notes, todos } from '@/server/lib/db/schema'
import { ASSET_LIFECYCLE_STATUS } from '@/shared/assets/asset-lifecycle.types'


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
  includeArchived = false,
  timeRangeHint,
  limit = 100,
}: KeywordSearchOptions): Promise<KeywordCandidate[]> {
  const clampedLimit = Math.min(Math.max(limit, ASSET_LIST_LIMIT_MIN), ASSET_LIST_LIMIT_MAX)
  const includeNotes = (!typeHint || typeHint === 'note') && completionHint !== 'complete'
  const includeBookmarks = (!typeHint || typeHint === 'link') && completionHint !== 'complete'
  const includeTodos = !typeHint || typeHint === 'todo'

  const tasks: Array<Promise<AssetListItem[]>> = []

  if (includeNotes) {
    const noteStatuses = includeArchived
      ? [ASSET_LIFECYCLE_STATUS.ACTIVE, ASSET_LIFECYCLE_STATUS.ARCHIVED]
      : [ASSET_LIFECYCLE_STATUS.ACTIVE]

    tasks.push(
      db
        .select()
        .from(notes)
        .where(
          and(
            eq(notes.userId, userId),
            noteStatuses.length === 1
              ? eq(notes.lifecycleStatus, noteStatuses[0])
              : inArray(notes.lifecycleStatus, noteStatuses)
          )
        )
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
    const bookmarkStatuses = includeArchived
      ? [ASSET_LIFECYCLE_STATUS.ACTIVE, ASSET_LIFECYCLE_STATUS.ARCHIVED]
      : [ASSET_LIFECYCLE_STATUS.ACTIVE]

    tasks.push(
      db
        .select()
        .from(bookmarks)
        .where(
          and(
            eq(bookmarks.userId, userId),
            bookmarkStatuses.length === 1
              ? eq(bookmarks.lifecycleStatus, bookmarkStatuses[0])
              : inArray(bookmarks.lifecycleStatus, bookmarkStatuses)
          )
        )
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
    const todoStatuses = includeArchived
      ? [ASSET_LIFECYCLE_STATUS.ACTIVE, ASSET_LIFECYCLE_STATUS.ARCHIVED]
      : [ASSET_LIFECYCLE_STATUS.ACTIVE]

    const todoConditions: SQL[] = [
      eq(todos.userId, userId),
      todoStatuses.length === 1
        ? eq(todos.lifecycleStatus, todoStatuses[0])
        : inArray(todos.lifecycleStatus, todoStatuses),
    ]

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
