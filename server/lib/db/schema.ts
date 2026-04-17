import { sql } from 'drizzle-orm'
import { boolean, check, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, vector } from 'drizzle-orm/pg-core'

import { ASSET_LIFECYCLE_STATUS } from '@/shared/assets/asset-lifecycle.types'

import type { BookmarkMeta } from '@/shared/assets/bookmark-meta.types'

export const users = pgTable(
  'users',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    emailVerified: boolean('email_verified').default(false).notNull(),
    image: text('image'),
    role: text('role', { enum: ['super_admin', 'user'] }).default('user').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    check('users_role_check', sql`${table.role} in ('super_admin', 'user')`),
    uniqueIndex('users_single_super_admin_idx')
      .on(table.role)
      .where(sql`${table.role} = 'super_admin'`),
  ]
)

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
})

export const accounts = pgTable('accounts', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const verifications = pgTable('verifications', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const ASSET_EMBEDDING_DIMENSIONS = 1024

export const notes = pgTable(
  'notes',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    originalText: text('original_text').notNull(),
    lifecycleStatus: text('lifecycle_status', {
      enum: [
        ASSET_LIFECYCLE_STATUS.ACTIVE,
        ASSET_LIFECYCLE_STATUS.ARCHIVED,
        ASSET_LIFECYCLE_STATUS.TRASHED,
      ],
    })
      .default(ASSET_LIFECYCLE_STATUS.ACTIVE)
      .notNull(),
    archivedAt: timestamp('archived_at'),
    trashedAt: timestamp('trashed_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('notes_user_created_at_idx').on(table.userId, table.createdAt),
    index('notes_user_lifecycle_created_at_idx').on(
      table.userId,
      table.lifecycleStatus,
      table.createdAt
    ),
    check(
      'notes_lifecycle_status_check',
      sql`${table.lifecycleStatus} in ('active', 'archived', 'trashed')`
    ),
  ]
)

export const noteEmbeddings = pgTable(
  'note_embeddings',
  {
    id: text('id').primaryKey(),
    noteId: text('note_id')
      .notNull()
      .references(() => notes.id, { onDelete: 'cascade' }),
    embedding: vector('embedding', { dimensions: ASSET_EMBEDDING_DIMENSIONS }).notNull(),
    embeddedText: text('embedded_text').notNull(),
    modelName: text('model_name').notNull(),
    dimensions: integer('dimensions').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('note_embeddings_note_model_dimensions_idx').on(
      table.noteId,
      table.modelName,
      table.dimensions
    ),
    index('note_embeddings_note_id_idx').on(table.noteId),
    index('note_embeddings_embedding_hnsw_cosine_idx').using(
      'hnsw',
      table.embedding.op('vector_cosine_ops')
    ),
  ]
)

export const todos = pgTable(
  'todos',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    originalText: text('original_text').notNull(),
    timeText: text('time_text'),
    dueAt: timestamp('due_at'),
    completedAt: timestamp('completed_at'),
    lifecycleStatus: text('lifecycle_status', {
      enum: [
        ASSET_LIFECYCLE_STATUS.ACTIVE,
        ASSET_LIFECYCLE_STATUS.ARCHIVED,
        ASSET_LIFECYCLE_STATUS.TRASHED,
      ],
    })
      .default(ASSET_LIFECYCLE_STATUS.ACTIVE)
      .notNull(),
    archivedAt: timestamp('archived_at'),
    trashedAt: timestamp('trashed_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('todos_user_created_at_idx').on(table.userId, table.createdAt),
    index('todos_user_completed_at_idx').on(table.userId, table.completedAt),
    index('todos_user_lifecycle_created_at_idx').on(
      table.userId,
      table.lifecycleStatus,
      table.createdAt
    ),
    check(
      'todos_lifecycle_status_check',
      sql`${table.lifecycleStatus} in ('active', 'archived', 'trashed')`
    ),
  ]
)

export const todoEmbeddings = pgTable(
  'todo_embeddings',
  {
    id: text('id').primaryKey(),
    todoId: text('todo_id')
      .notNull()
      .references(() => todos.id, { onDelete: 'cascade' }),
    embedding: vector('embedding', { dimensions: ASSET_EMBEDDING_DIMENSIONS }).notNull(),
    embeddedText: text('embedded_text').notNull(),
    modelName: text('model_name').notNull(),
    dimensions: integer('dimensions').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('todo_embeddings_todo_model_dimensions_idx').on(
      table.todoId,
      table.modelName,
      table.dimensions
    ),
    index('todo_embeddings_todo_id_idx').on(table.todoId),
    index('todo_embeddings_embedding_hnsw_cosine_idx').using(
      'hnsw',
      table.embedding.op('vector_cosine_ops')
    ),
  ]
)

export const bookmarks = pgTable(
  'bookmarks',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    originalText: text('original_text').notNull(),
    url: text('url'),
    bookmarkMeta: jsonb('bookmark_meta').$type<BookmarkMeta>(),
    lifecycleStatus: text('lifecycle_status', {
      enum: [
        ASSET_LIFECYCLE_STATUS.ACTIVE,
        ASSET_LIFECYCLE_STATUS.ARCHIVED,
        ASSET_LIFECYCLE_STATUS.TRASHED,
      ],
    })
      .default(ASSET_LIFECYCLE_STATUS.ACTIVE)
      .notNull(),
    archivedAt: timestamp('archived_at'),
    trashedAt: timestamp('trashed_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('bookmarks_user_created_at_idx').on(table.userId, table.createdAt),
    index('bookmarks_user_lifecycle_created_at_idx').on(
      table.userId,
      table.lifecycleStatus,
      table.createdAt
    ),
    check(
      'bookmarks_lifecycle_status_check',
      sql`${table.lifecycleStatus} in ('active', 'archived', 'trashed')`
    ),
  ]
)

export const bookmarkEmbeddings = pgTable(
  'bookmark_embeddings',
  {
    id: text('id').primaryKey(),
    bookmarkId: text('bookmark_id')
      .notNull()
      .references(() => bookmarks.id, { onDelete: 'cascade' }),
    embedding: vector('embedding', { dimensions: ASSET_EMBEDDING_DIMENSIONS }).notNull(),
    embeddedText: text('embedded_text').notNull(),
    modelName: text('model_name').notNull(),
    dimensions: integer('dimensions').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('bookmark_embeddings_bookmark_model_dimensions_idx').on(
      table.bookmarkId,
      table.modelName,
      table.dimensions
    ),
    index('bookmark_embeddings_bookmark_id_idx').on(table.bookmarkId),
    index('bookmark_embeddings_embedding_hnsw_cosine_idx').using(
      'hnsw',
      table.embedding.op('vector_cosine_ops')
    ),
  ]
)

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Session = typeof sessions.$inferSelect
export type Account = typeof accounts.$inferSelect
export type Verification = typeof verifications.$inferSelect
export type Note = typeof notes.$inferSelect
export type NewNote = typeof notes.$inferInsert
export type NoteListItem = typeof notes.$inferSelect
export type Todo = typeof todos.$inferSelect
export type NewTodo = typeof todos.$inferInsert
export type TodoListItem = typeof todos.$inferSelect
export type Bookmark = typeof bookmarks.$inferSelect
export type NewBookmark = typeof bookmarks.$inferInsert
export type BookmarkListItem = typeof bookmarks.$inferSelect
