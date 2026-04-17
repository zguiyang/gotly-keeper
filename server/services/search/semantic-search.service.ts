import 'server-only'

import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { and, eq, inArray, isNull, sql } from 'drizzle-orm'
import { cosineDistance } from 'drizzle-orm/sql/functions'

import {
  ASSET_EMBEDDING_CANDIDATE_LIMIT_MAX,
  ASSET_EMBEDDING_CANDIDATE_MULTIPLIER,
  ASSET_EMBEDDING_MAX_COSINE_DISTANCE,
  ASSET_EMBEDDING_TIMEOUT_MS,
  ASSET_LIST_LIMIT_MIN,
  ASSET_SEARCH_LIMIT_DEFAULT,
  ASSET_SEARCH_LIMIT_MAX,
} from '@/server/lib/config/constants'
import { db } from '@/server/lib/db'
import {
  ASSET_EMBEDDING_DIMENSIONS,
  bookmarkEmbeddings,
  bookmarks,
  noteEmbeddings,
  notes,
  todoEmbeddings,
  todos,
} from '@/server/lib/db/schema'
import { serverEnv } from '@/server/lib/env'
import { ASSET_LIFECYCLE_STATUS } from '@/shared/assets/asset-lifecycle.types'
import { now } from '@/shared/time/dayjs'

import type { AssetType, SemanticCandidate } from './search.types'
import type { AssetListItem } from '@/shared/assets/assets.types'


type SemanticSearchOptions = {
  userId: string
  query: string
  typeHint?: AssetType | null
  completionHint?: 'complete' | 'incomplete' | null
  includeArchived?: boolean
  limit?: number
}

type EmbeddableAsset = {
  id: string
  type: AssetType
  originalText: string
  url: string | null
  timeText: string | null
}

export async function deleteEmbeddingsForAsset(input: {
  assetType: AssetType
  assetId: string
}): Promise<number> {
  if (input.assetType === 'note') {
    const deleted = await db
      .delete(noteEmbeddings)
      .where(eq(noteEmbeddings.noteId, input.assetId))
      .returning({ id: noteEmbeddings.id })
    return deleted.length
  }

  if (input.assetType === 'todo') {
    const deleted = await db
      .delete(todoEmbeddings)
      .where(eq(todoEmbeddings.todoId, input.assetId))
      .returning({ id: todoEmbeddings.id })
    return deleted.length
  }

  const deleted = await db
    .delete(bookmarkEmbeddings)
    .where(eq(bookmarkEmbeddings.bookmarkId, input.assetId))
    .returning({ id: bookmarkEmbeddings.id })

  return deleted.length
}

function getAssetEmbeddingModel() {
  const { apiKey, url, embeddingModelName, embeddingDimensions } = serverEnv.aiGateway
  if (!apiKey || !url || !embeddingModelName || !embeddingDimensions) return null

  if (embeddingDimensions !== ASSET_EMBEDDING_DIMENSIONS) {
    console.warn(
      `[assets.embedding] AI_EMBEDDING_DIMENSIONS=${embeddingDimensions} does not match schema dimension ${ASSET_EMBEDDING_DIMENSIONS}`
    )
    return null
  }

  return createOpenAICompatible({
    name: 'dashscope',
    apiKey,
    baseURL: url,
  }).embeddingModel(embeddingModelName)
}

function getAssetEmbeddingText(asset: EmbeddableAsset) {
  return [asset.originalText, asset.url, asset.timeText].filter(Boolean).join('\n')
}

async function embedText(value: string) {
  const model = getAssetEmbeddingModel()
  if (!model || !value.trim()) return null

  const { embed } = await import('ai')
  const { embedding } = await embed({
    model,
    value,
    maxRetries: 1,
    abortSignal: AbortSignal.timeout(ASSET_EMBEDDING_TIMEOUT_MS),
    providerOptions: {
      openaiCompatible: {
        dimensions: ASSET_EMBEDDING_DIMENSIONS,
      },
    },
  })

  return { modelId: model.modelId, embedding }
}

async function createEmbeddingBestEffort(asset: EmbeddableAsset) {
  try {
    const value = getAssetEmbeddingText(asset)
    const embedded = await embedText(value)
    if (!embedded) return null

    const row = {
      id: crypto.randomUUID(),
      embedding: embedded.embedding,
      embeddedText: value,
      modelName: embedded.modelId,
      dimensions: ASSET_EMBEDDING_DIMENSIONS,
      updatedAt: now(),
    }

    if (asset.type === 'note') {
      const [created] = await db
        .insert(noteEmbeddings)
        .values({ ...row, noteId: asset.id })
        .onConflictDoUpdate({
          target: [noteEmbeddings.noteId, noteEmbeddings.modelName, noteEmbeddings.dimensions],
          set: {
            embedding: row.embedding,
            embeddedText: row.embeddedText,
            updatedAt: row.updatedAt,
          },
        })
        .returning()
      return created
    }

    if (asset.type === 'todo') {
      const [created] = await db
        .insert(todoEmbeddings)
        .values({ ...row, todoId: asset.id })
        .onConflictDoUpdate({
          target: [todoEmbeddings.todoId, todoEmbeddings.modelName, todoEmbeddings.dimensions],
          set: {
            embedding: row.embedding,
            embeddedText: row.embeddedText,
            updatedAt: row.updatedAt,
          },
        })
        .returning()
      return created
    }

    const [created] = await db
      .insert(bookmarkEmbeddings)
      .values({ ...row, bookmarkId: asset.id })
      .onConflictDoUpdate({
        target: [
          bookmarkEmbeddings.bookmarkId,
          bookmarkEmbeddings.modelName,
          bookmarkEmbeddings.dimensions,
        ],
        set: {
          embedding: row.embedding,
          embeddedText: row.embeddedText,
          updatedAt: row.updatedAt,
        },
      })
      .returning()
    return created
  } catch (error) {
    console.warn('[assets.embedding] Failed to embed asset', {
      assetId: asset.id,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

export async function backfillMissingAssetEmbeddings(limit = 50) {
  const model = getAssetEmbeddingModel()
  if (!model) {
    return { attempted: 0, embedded: 0, failed: 0, skipped: true }
  }

  const clampedLimit = Math.min(Math.max(limit, 1), 100)

  const indexableStatuses = [ASSET_LIFECYCLE_STATUS.ACTIVE, ASSET_LIFECYCLE_STATUS.ARCHIVED]

  const [missingNotes, missingTodos, missingBookmarks] = await Promise.all([
    db
      .select({
        id: notes.id,
        originalText: notes.originalText,
      })
      .from(notes)
      .leftJoin(
        noteEmbeddings,
        and(
          eq(noteEmbeddings.noteId, notes.id),
          eq(noteEmbeddings.modelName, model.modelId),
          eq(noteEmbeddings.dimensions, ASSET_EMBEDDING_DIMENSIONS)
        )
      )
      .where(
        and(
          isNull(noteEmbeddings.id),
          inArray(notes.lifecycleStatus, indexableStatuses)
        )
      )
      .limit(clampedLimit),
    db
      .select({
        id: todos.id,
        originalText: todos.originalText,
        timeText: todos.timeText,
      })
      .from(todos)
      .leftJoin(
        todoEmbeddings,
        and(
          eq(todoEmbeddings.todoId, todos.id),
          eq(todoEmbeddings.modelName, model.modelId),
          eq(todoEmbeddings.dimensions, ASSET_EMBEDDING_DIMENSIONS)
        )
      )
      .where(
        and(
          isNull(todoEmbeddings.id),
          inArray(todos.lifecycleStatus, indexableStatuses)
        )
      )
      .limit(clampedLimit),
    db
      .select({
        id: bookmarks.id,
        originalText: bookmarks.originalText,
        url: bookmarks.url,
      })
      .from(bookmarks)
      .leftJoin(
        bookmarkEmbeddings,
        and(
          eq(bookmarkEmbeddings.bookmarkId, bookmarks.id),
          eq(bookmarkEmbeddings.modelName, model.modelId),
          eq(bookmarkEmbeddings.dimensions, ASSET_EMBEDDING_DIMENSIONS)
        )
      )
      .where(
        and(
          isNull(bookmarkEmbeddings.id),
          inArray(bookmarks.lifecycleStatus, indexableStatuses)
        )
      )
      .limit(clampedLimit),
  ])

  const candidates: EmbeddableAsset[] = [
    ...missingNotes.map((note) => ({
      id: note.id,
      type: 'note' as const,
      originalText: note.originalText,
      url: null,
      timeText: null,
    })),
    ...missingTodos.map((todo) => ({
      id: todo.id,
      type: 'todo' as const,
      originalText: todo.originalText,
      url: null,
      timeText: todo.timeText,
    })),
    ...missingBookmarks.map((bookmark) => ({
      id: bookmark.id,
      type: 'link' as const,
      originalText: bookmark.originalText,
      url: bookmark.url ?? null,
      timeText: null,
    })),
  ].slice(0, clampedLimit)

  let embedded = 0
  let failed = 0
  for (const asset of candidates) {
    const result = await createEmbeddingBestEffort(asset)
    if (result) embedded += 1
    else failed += 1
  }

  return { attempted: candidates.length, embedded, failed, skipped: false }
}

function toNoteAssetItem(row: { id: string; originalText: string; createdAt: Date }): AssetListItem {
  return {
    id: row.id,
    originalText: row.originalText,
    title: row.originalText.slice(0, 32),
    excerpt: row.originalText,
    type: 'note',
    url: null,
    timeText: null,
    dueAt: null,
    completed: false,
    createdAt: row.createdAt,
  }
}

function toTodoAssetItem(row: {
  id: string
  originalText: string
  timeText: string | null
  dueAt: Date | null
  completedAt: Date | null
  createdAt: Date
}): AssetListItem {
  return {
    id: row.id,
    originalText: row.originalText,
    title: row.originalText.slice(0, 32),
    excerpt: row.originalText,
    type: 'todo',
    url: null,
    timeText: row.timeText,
    dueAt: row.dueAt,
    completed: row.completedAt !== null,
    createdAt: row.createdAt,
  }
}

function toBookmarkAssetItem(row: {
  id: string
  originalText: string
  url: string | null
  bookmarkMeta: typeof bookmarks.$inferSelect['bookmarkMeta']
  createdAt: Date
}): AssetListItem {
  return {
    id: row.id,
    originalText: row.originalText,
    title: row.bookmarkMeta?.title ?? row.originalText.slice(0, 32),
    excerpt:
      row.bookmarkMeta?.description ??
      row.bookmarkMeta?.contentSummary ??
      row.originalText,
    type: 'link',
    url: row.url ?? null,
    timeText: null,
    dueAt: null,
    completed: false,
    bookmarkMeta: row.bookmarkMeta ?? null,
    createdAt: row.createdAt,
  }
}

export async function searchByEmbedding({
  userId,
  query,
  typeHint,
  completionHint,
  includeArchived = false,
  limit = ASSET_SEARCH_LIMIT_DEFAULT,
}: SemanticSearchOptions): Promise<SemanticCandidate[]> {
  const model = getAssetEmbeddingModel()
  const trimmed = query.trim()
  if (!model || !trimmed) return []

  const embedded = await embedText(trimmed)
  if (!embedded) return []

  const clampedLimit = Math.min(Math.max(limit, ASSET_LIST_LIMIT_MIN), ASSET_SEARCH_LIMIT_MAX)
  const candidateLimit = Math.min(
    Math.max(clampedLimit * ASSET_EMBEDDING_CANDIDATE_MULTIPLIER, clampedLimit),
    ASSET_EMBEDDING_CANDIDATE_LIMIT_MAX
  )

  const includeNotes = (!typeHint || typeHint === 'note') && completionHint !== 'complete'
  const includeBookmarks = (!typeHint || typeHint === 'link') && completionHint !== 'complete'
  const includeTodos = !typeHint || typeHint === 'todo'
  const searchableStatuses = includeArchived
    ? [ASSET_LIFECYCLE_STATUS.ACTIVE, ASSET_LIFECYCLE_STATUS.ARCHIVED]
    : [ASSET_LIFECYCLE_STATUS.ACTIVE]

  const tasks: Array<Promise<SemanticCandidate[]>> = []

  if (includeNotes) {
    const distance = cosineDistance(noteEmbeddings.embedding, embedded.embedding)
    tasks.push(
      db
        .select({
          id: notes.id,
          originalText: notes.originalText,
          createdAt: notes.createdAt,
          distance,
        })
        .from(noteEmbeddings)
        .innerJoin(notes, eq(noteEmbeddings.noteId, notes.id))
        .where(
          and(
            eq(notes.userId, userId),
            searchableStatuses.length === 1
              ? eq(notes.lifecycleStatus, searchableStatuses[0])
              : inArray(notes.lifecycleStatus, searchableStatuses),
            eq(noteEmbeddings.modelName, model.modelId),
            eq(noteEmbeddings.dimensions, ASSET_EMBEDDING_DIMENSIONS)
          )
        )
        .orderBy(distance)
        .limit(candidateLimit)
        .then((rows) =>
          rows.map((row) => ({
            asset: toNoteAssetItem(row),
            distance: Number(row.distance),
          }))
        )
    )
  }

  if (includeBookmarks) {
    const distance = cosineDistance(bookmarkEmbeddings.embedding, embedded.embedding)
    tasks.push(
      db
        .select({
          id: bookmarks.id,
          originalText: bookmarks.originalText,
          url: bookmarks.url,
          bookmarkMeta: bookmarks.bookmarkMeta,
          createdAt: bookmarks.createdAt,
          distance,
        })
        .from(bookmarkEmbeddings)
        .innerJoin(bookmarks, eq(bookmarkEmbeddings.bookmarkId, bookmarks.id))
        .where(
          and(
            eq(bookmarks.userId, userId),
            searchableStatuses.length === 1
              ? eq(bookmarks.lifecycleStatus, searchableStatuses[0])
              : inArray(bookmarks.lifecycleStatus, searchableStatuses),
            eq(bookmarkEmbeddings.modelName, model.modelId),
            eq(bookmarkEmbeddings.dimensions, ASSET_EMBEDDING_DIMENSIONS)
          )
        )
        .orderBy(distance)
        .limit(candidateLimit)
        .then((rows) =>
          rows.map((row) => ({
            asset: toBookmarkAssetItem(row),
            distance: Number(row.distance),
          }))
        )
    )
  }

  if (includeTodos) {
    const distance = cosineDistance(todoEmbeddings.embedding, embedded.embedding)
    const conditions = [
      eq(todos.userId, userId),
      searchableStatuses.length === 1
        ? eq(todos.lifecycleStatus, searchableStatuses[0])
        : inArray(todos.lifecycleStatus, searchableStatuses),
      eq(todoEmbeddings.modelName, model.modelId),
      eq(todoEmbeddings.dimensions, ASSET_EMBEDDING_DIMENSIONS),
    ]
    if (completionHint === 'complete') {
      conditions.push(sql`${todos.completedAt} is not null`)
    }
    if (completionHint === 'incomplete') {
      conditions.push(sql`${todos.completedAt} is null`)
    }

    tasks.push(
      db
        .select({
          id: todos.id,
          originalText: todos.originalText,
          timeText: todos.timeText,
          dueAt: todos.dueAt,
          completedAt: todos.completedAt,
          createdAt: todos.createdAt,
          distance,
        })
        .from(todoEmbeddings)
        .innerJoin(todos, eq(todoEmbeddings.todoId, todos.id))
        .where(and(...conditions))
        .orderBy(distance)
        .limit(candidateLimit)
        .then((rows) =>
          rows.map((row) => ({
            asset: toTodoAssetItem(row),
            distance: Number(row.distance),
          }))
        )
    )
  }

  return (await Promise.all(tasks))
    .flat()
    .sort((a, b) => a.distance - b.distance)
    .filter((row) => row.distance <= ASSET_EMBEDDING_MAX_COSINE_DISTANCE)
    .slice(0, clampedLimit)
}
