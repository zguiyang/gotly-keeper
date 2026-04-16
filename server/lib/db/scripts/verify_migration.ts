import 'dotenv/config'

import chalk from 'chalk'

import { pool } from '@/server/lib/db/client'

interface MigrationCount {
  oldTable: string
  newTable: string
  oldCount: number
  newCount: number
  matched: boolean
}

interface ContentCheck {
  table: string
  userId: string
  id: string
  field: string
  oldValue: string | null
  newValue: string | null
  matched: boolean
}

async function main() {
  console.info(chalk.cyan('\n=== Migration Verification Script ===\n'))

  const results: { counts: MigrationCount[]; contentChecks: ContentCheck[]; errors: string[] } = {
    counts: [],
    contentChecks: [],
    errors: [],
  }

  try {
    await verifyNotesMigration(results)
    await verifyTodosMigration(results)
    await verifyBookmarksMigration(results)
    await verifyEmbeddingsMigration(results)
    await verifyContentSamples(results)
  } catch (error) {
    results.errors.push(`Verification failed: ${error}`)
  }

  console.info(chalk.cyan('\n=== Results ===\n'))

  console.info(chalk.white('Count Verification:'))
  for (const count of results.counts) {
    const status = count.matched ? chalk.green('✓') : chalk.red('✗')
    console.info(
      `  ${status} ${count.oldTable} (${count.oldCount}) -> ${count.newTable} (${count.newCount})`
    )
  }

  if (results.contentChecks.length > 0) {
    console.info(chalk.white('\nContent Verification (sample):'))
    for (const check of results.contentChecks) {
      const status = check.matched ? chalk.green('✓') : chalk.red('✗')
      console.info(
        `  ${status} ${check.table}[${check.id}].${check.field}: "${truncate(check.oldValue)}" -> "${truncate(check.newValue)}"`
      )
    }
  }

  if (results.errors.length > 0) {
    console.info(chalk.red('\nErrors:'))
    for (const error of results.errors) {
      console.info(`  ${chalk.red('✗')} ${error}`)
    }
  }

  const allCountsMatched = results.counts.every((c) => c.matched)
  const allContentMatched = results.contentChecks.every((c) => c.matched)

  console.info(chalk.cyan('\n=== Summary ===\n'))
  if (allCountsMatched && allContentMatched && results.errors.length === 0) {
    console.info(chalk.green('✓ All migrations verified successfully!'))
    console.info(chalk.green('Note: asset_embeddings should be cleaned up manually after verification.'))
  } else {
    console.info(chalk.red('✗ Migration verification failed. Review errors above.'))
    process.exitCode = 1
  }
}

async function verifyNotesMigration(results: { counts: MigrationCount[]; contentChecks: ContentCheck[]; errors: string[] }) {
  const query = `
    SELECT 
      COUNT(*) as old_count,
      (SELECT COUNT(*) FROM notes) as new_count
    FROM assets WHERE type = 'note'
  `
  const { rows } = await pool.query(query)
  const { old_count, new_count } = rows[0] as { old_count: string; new_count: string }
  
  results.counts.push({
    oldTable: 'assets (notes)',
    newTable: 'notes',
    oldCount: Number(old_count),
    newCount: Number(new_count),
    matched: Number(old_count) === Number(new_count),
  })
}

async function verifyTodosMigration(results: { counts: MigrationCount[]; contentChecks: ContentCheck[]; errors: string[] }) {
  const query = `
    SELECT 
      COUNT(*) as old_count,
      (SELECT COUNT(*) FROM todos) as new_count
    FROM assets WHERE type = 'todo'
  `
  const { rows } = await pool.query(query)
  const { old_count, new_count } = rows[0] as { old_count: string; new_count: string }
  
  results.counts.push({
    oldTable: 'assets (todos)',
    newTable: 'todos',
    oldCount: Number(old_count),
    newCount: Number(new_count),
    matched: Number(old_count) === Number(new_count),
  })
}

async function verifyBookmarksMigration(results: { counts: MigrationCount[]; contentChecks: ContentCheck[]; errors: string[] }) {
  const query = `
    SELECT 
      COUNT(*) as old_count,
      (SELECT COUNT(*) FROM bookmarks) as new_count
    FROM assets WHERE type = 'link'
  `
  const { rows } = await pool.query(query)
  const { old_count, new_count } = rows[0] as { old_count: string; new_count: string }
  
  results.counts.push({
    oldTable: 'assets (bookmarks)',
    newTable: 'bookmarks',
    oldCount: Number(old_count),
    newCount: Number(new_count),
    matched: Number(old_count) === Number(new_count),
  })
}

async function verifyEmbeddingsMigration(results: { counts: MigrationCount[]; contentChecks: ContentCheck[]; errors: string[] }) {
  const query = `
    SELECT 
      COUNT(*) as total_embeddings,
      (SELECT COUNT(*) FROM note_embeddings) as note_emb_count,
      (SELECT COUNT(*) FROM todo_embeddings) as todo_emb_count,
      (SELECT COUNT(*) FROM bookmark_embeddings) as bookmark_emb_count
    FROM asset_embeddings ae
    JOIN assets a ON ae.asset_id = a.id
  `
  const { rows } = await pool.query(query)
  const { total_embeddings, note_emb_count, todo_emb_count, bookmark_emb_count } = rows[0] as {
    total_embeddings: string
    note_emb_count: string
    todo_emb_count: string
    bookmark_emb_count: string
  }
  
  const totalNew = Number(note_emb_count) + Number(todo_emb_count) + Number(bookmark_emb_count)

  results.counts.push({
    oldTable: 'asset_embeddings',
    newTable: 'note_embeddings + todo_embeddings + bookmark_embeddings',
    oldCount: Number(total_embeddings),
    newCount: totalNew,
    matched: Number(total_embeddings) === totalNew,
  })
}

async function verifyContentSamples(results: { counts: MigrationCount[]; contentChecks: ContentCheck[]; errors: string[] }) {
  await verifySampleNotes(results)
  await verifySampleTodos(results)
  await verifySampleBookmarks(results)
}

async function verifySampleNotes(results: { counts: MigrationCount[]; contentChecks: ContentCheck[]; errors: string[] }) {
  const query = `
    SELECT a.id, a.user_id, a.original_text, a.created_at, a.updated_at,
           n.id as new_id, n.original_text as new_original_text
    FROM assets a
    JOIN notes n ON a.id = n.id
    WHERE a.type = 'note'
    LIMIT 5
  `
  const { rows } = await pool.query(query)
  
  for (const row of rows) {
    const r = row as { id: string; original_text: string; new_id: string; new_original_text: string }
    results.contentChecks.push({
      table: 'notes',
      userId: '',
      id: r.id,
      field: 'original_text',
      oldValue: r.original_text,
      newValue: r.new_original_text,
      matched: r.original_text === r.new_original_text,
    })
  }
}

async function verifySampleTodos(results: { counts: MigrationCount[]; contentChecks: ContentCheck[]; errors: string[] }) {
  const query = `
    SELECT a.id, a.user_id, a.original_text, a.time_text, a.due_at, a.completed_at,
           t.id as new_id, t.original_text as new_original_text, t.time_text as new_time_text,
           t.due_at as new_due_at, t.completed_at as new_completed_at
    FROM assets a
    JOIN todos t ON a.id = t.id
    WHERE a.type = 'todo'
    LIMIT 5
  `
  const { rows } = await pool.query(query)
  
  for (const row of rows) {
    const r = row as {
      id: string
      original_text: string
      time_text: string | null
      new_id: string
      new_original_text: string
      new_time_text: string | null
    }
    results.contentChecks.push({
      table: 'todos',
      userId: '',
      id: r.id,
      field: 'original_text',
      oldValue: r.original_text,
      newValue: r.new_original_text,
      matched: r.original_text === r.new_original_text,
    })
    if (r.time_text !== r.new_time_text) {
      results.contentChecks.push({
        table: 'todos',
        userId: '',
        id: r.id,
        field: 'time_text',
        oldValue: r.time_text,
        newValue: r.new_time_text,
        matched: r.time_text === r.new_time_text,
      })
    }
  }
}

async function verifySampleBookmarks(results: { counts: MigrationCount[]; contentChecks: ContentCheck[]; errors: string[] }) {
  const query = `
    SELECT a.id, a.user_id, a.original_text, a.url, a.bookmark_meta,
           b.id as new_id, b.original_text as new_original_text, b.url as new_url
    FROM assets a
    JOIN bookmarks b ON a.id = b.id
    WHERE a.type = 'link'
    LIMIT 5
  `
  const { rows } = await pool.query(query)
  
  for (const row of rows) {
    const r = row as {
      id: string
      original_text: string
      url: string | null
      new_id: string
      new_original_text: string
      new_url: string | null
    }
    results.contentChecks.push({
      table: 'bookmarks',
      userId: '',
      id: r.id,
      field: 'original_text',
      oldValue: r.original_text,
      newValue: r.new_original_text,
      matched: r.original_text === r.new_original_text,
    })
    if (r.url !== r.new_url) {
      results.contentChecks.push({
        table: 'bookmarks',
        userId: '',
        id: r.id,
        field: 'url',
        oldValue: r.url,
        newValue: r.new_url,
        matched: r.url === r.new_url,
      })
    }
  }
}

function truncate(value: string | null, maxLength = 50): string {
  if (value === null) return 'null'
  if (value.length <= maxLength) return value
  return value.substring(0, maxLength) + '...'
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await pool.end()
  })
