import { sql } from 'drizzle-orm'
import { boolean, check, index, integer, pgTable, text, timestamp, uniqueIndex, vector } from 'drizzle-orm/pg-core'

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

export const assets = pgTable(
  'assets',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    originalText: text('original_text').notNull(),
    type: text('type', { enum: ['note', 'link', 'todo'] }).notNull(),
    url: text('url'),
    timeText: text('time_text'),
    dueAt: timestamp('due_at'),
    completedAt: timestamp('completed_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    check('assets_type_check', sql`${table.type} in ('note', 'link', 'todo')`),
    index('assets_user_created_at_idx').on(table.userId, table.createdAt),
    index('assets_user_type_created_at_idx').on(table.userId, table.type, table.createdAt),
    index('assets_user_completed_at_idx').on(table.userId, table.completedAt),
  ]
)

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Session = typeof sessions.$inferSelect
export type Account = typeof accounts.$inferSelect
export type Verification = typeof verifications.$inferSelect
export type Asset = typeof assets.$inferSelect
export type NewAsset = typeof assets.$inferInsert

export const assetEmbeddings = pgTable(
  'asset_embeddings',
  {
    id: text('id').primaryKey(),
    assetId: text('asset_id')
      .notNull()
      .references(() => assets.id, { onDelete: 'cascade' }),
    embedding: vector('embedding', { dimensions: ASSET_EMBEDDING_DIMENSIONS }).notNull(),
    embeddedText: text('embedded_text').notNull(),
    modelName: text('model_name').notNull(),
    dimensions: integer('dimensions').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('asset_embeddings_asset_model_dimensions_idx').on(
      table.assetId,
      table.modelName,
      table.dimensions
    ),
    index('asset_embeddings_asset_id_idx').on(table.assetId),
  ]
)

export type AssetEmbedding = typeof assetEmbeddings.$inferSelect
export type NewAssetEmbedding = typeof assetEmbeddings.$inferInsert
