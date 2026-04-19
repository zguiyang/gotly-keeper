import 'server-only'

import { asc, isNull, or, eq } from 'drizzle-orm'

import { db } from '@/server/lib/db'
import { bookmarks, notes, todos } from '@/server/lib/db/schema'
import { now } from '@/shared/time/dayjs'

import type { BookmarkMeta } from '@/shared/assets/bookmark-meta.types'

type StructuredNoteBackfill = {
  title: string | null
  content: string | null
  summary: string | null
}

type StructuredTodoBackfill = {
  title: string | null
  content: string | null
}

type StructuredBookmarkBackfill = {
  title: string | null
  note: string | null
  summary: string | null
}

type BackfillStats = {
  scanned: number
  updated: number
  skipped: number
}

type BackfillResult = {
  notes: BackfillStats
  todos: BackfillStats
  bookmarks: BackfillStats
  dryRun: boolean
  limitPerType: number
}

const NOTE_COMMAND_PREFIXES = [
  '记一下',
  '记下',
  '记录一下',
  '记录下',
  '记录',
  '写一下',
  '写下',
  '补充一下',
  '补充下',
  '备忘一下',
  '备忘',
  '笔记',
  '想法',
  '灵感',
] as const

const TODO_COMMAND_PREFIXES = [
  '提醒我',
  '提醒一下',
  '提醒',
  '记得',
  '记个待办',
  '记一下待办',
  '待办',
  'todo',
  '任务',
  '帮我',
] as const

const BOOKMARK_COMMAND_PREFIXES = [
  '存一下这个链接',
  '存一下链接',
  '存一下这个网址',
  '存一下网址',
  '存一下',
  '收藏一下这个链接',
  '收藏一下链接',
  '收藏一下',
  '收藏',
  '保存一下',
  '保存',
  '记个书签',
  '书签',
  '链接',
  '网址',
] as const

function normalizeInlineText(text: string): string {
  return text.replace(/\s+/g, ' ').replace(/^[\-•*·]+\s*/, '').trim()
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  if (value === undefined || value === null) {
    return null
  }

  const normalized = normalizeInlineText(value)
  return normalized || null
}

function splitMeaningfulLines(text: string): string[] {
  return text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(normalizeInlineText)
    .filter(Boolean)
}

function stripLeadingCommandPrefix(
  value: string,
  prefixes: readonly string[]
): string | null {
  const trimmed = normalizeInlineText(value)
  if (!trimmed) {
    return null
  }

  for (const prefix of prefixes) {
    if (!trimmed.toLowerCase().startsWith(prefix.toLowerCase())) {
      continue
    }

    const remainder = normalizeInlineText(trimmed.slice(prefix.length).replace(/^[：:，,\-\s]+/, ''))
    return remainder || null
  }

  return trimmed
}

function isUrlLine(line: string): boolean {
  return /^https?:\/\//i.test(line.trim())
}

function normalizeParagraph(lines: string[]): string | null {
  const normalized = lines.map(normalizeInlineText).filter(Boolean).join('\n')
  return normalized || null
}

function buildSummaryText(text: string | null): string | null {
  const normalized = normalizeOptionalText(text)
  if (!normalized) {
    return null
  }

  return normalized.length <= 180 ? normalized : `${normalized.slice(0, 177).trimEnd()}...`
}

function resolveStructuredTitle(lines: string[], prefixes: readonly string[]): {
  title: string | null
  consumedLines: number
} {
  if (lines.length === 0) {
    return { title: null, consumedLines: 0 }
  }

  const first = stripLeadingCommandPrefix(lines[0], prefixes)
  if (first) {
    return { title: first, consumedLines: 1 }
  }

  if (lines.length === 1) {
    return { title: null, consumedLines: 1 }
  }

  const second = stripLeadingCommandPrefix(lines[1], prefixes)
  return {
    title: second,
    consumedLines: second ? 2 : 1,
  }
}

function normalizeBookmarkTitleFromMeta(bookmarkMeta: BookmarkMeta | null | undefined): string | null {
  return normalizeOptionalText(bookmarkMeta?.title)
}

function stripKnownUrlFromCandidate(
  value: string | null | undefined,
  url: string | null | undefined
): string | null {
  const normalizedValue = normalizeOptionalText(value)
  if (!normalizedValue) {
    return null
  }

  const normalizedUrl = normalizeOptionalText(url)
  if (!normalizedUrl) {
    return normalizedValue
  }

  const stripped = normalizeInlineText(normalizedValue.split(normalizedUrl).join(' '))
  return stripped || null
}

function equalNormalizedText(left: string | null, right: string | null): boolean {
  if (!left || !right) {
    return false
  }

  return normalizeInlineText(left).toLowerCase() === normalizeInlineText(right).toLowerCase()
}

export function deriveNoteStructuredBackfill(input: {
  originalText: string
}): StructuredNoteBackfill {
  const lines = splitMeaningfulLines(input.originalText)
  const { title, consumedLines } = resolveStructuredTitle(lines, NOTE_COMMAND_PREFIXES)
  const content = normalizeParagraph(lines.slice(consumedLines))

  return {
    title,
    content,
    summary: buildSummaryText(content ?? title),
  }
}

export function deriveTodoStructuredBackfill(input: {
  originalText: string
}): StructuredTodoBackfill {
  const lines = splitMeaningfulLines(input.originalText)
  const { title, consumedLines } = resolveStructuredTitle(lines, TODO_COMMAND_PREFIXES)

  return {
    title,
    content: normalizeParagraph(lines.slice(consumedLines)),
  }
}

export function deriveBookmarkStructuredBackfill(input: {
  originalText: string
  url: string | null
  bookmarkMeta?: BookmarkMeta | null
}): StructuredBookmarkBackfill {
  const nonUrlLines = splitMeaningfulLines(input.originalText)
    .map((line) => stripKnownUrlFromCandidate(line, input.url))
    .filter((line): line is string => Boolean(line))
    .filter((line) => !isUrlLine(line))
  const metaTitle = stripKnownUrlFromCandidate(
    normalizeBookmarkTitleFromMeta(input.bookmarkMeta),
    input.url
  )

  let noteLines = nonUrlLines
  if (noteLines.length > 0) {
    const firstLineTitle = stripLeadingCommandPrefix(noteLines[0], BOOKMARK_COMMAND_PREFIXES)
    if (!firstLineTitle) {
      noteLines = noteLines.slice(1)
    } else if (metaTitle && equalNormalizedText(firstLineTitle, metaTitle)) {
      noteLines = noteLines.slice(1)
    } else if (!metaTitle) {
      noteLines = noteLines.slice(1)
    }
  }

  const title = metaTitle ?? resolveStructuredTitle(nonUrlLines, BOOKMARK_COMMAND_PREFIXES).title
  const note = normalizeParagraph(noteLines)
  const summary =
    buildSummaryText(input.bookmarkMeta?.contentSummary ?? null) ??
    buildSummaryText(input.bookmarkMeta?.description ?? null) ??
    buildSummaryText(note)

  return {
    title,
    note,
    summary,
  }
}

async function backfillNotes(limit: number, dryRun: boolean): Promise<BackfillStats> {
  const rows = await db
    .select({
      id: notes.id,
      originalText: notes.originalText,
      title: notes.title,
      content: notes.content,
      summary: notes.summary,
    })
    .from(notes)
    .where(or(isNull(notes.title), isNull(notes.content), isNull(notes.summary)))
    .orderBy(asc(notes.createdAt))
    .limit(limit)

  let updated = 0
  let skipped = 0

  for (const row of rows) {
    const derived = deriveNoteStructuredBackfill({ originalText: row.originalText })
    const patch = {
      ...(row.title === null && derived.title !== null ? { title: derived.title } : {}),
      ...(row.content === null && derived.content !== null ? { content: derived.content } : {}),
      ...(row.summary === null && derived.summary !== null ? { summary: derived.summary } : {}),
    }

    if (Object.keys(patch).length === 0) {
      skipped += 1
      continue
    }

    updated += 1
    if (!dryRun) {
      await db.update(notes).set({ ...patch, updatedAt: now() }).where(eq(notes.id, row.id))
    }
  }

  return { scanned: rows.length, updated, skipped }
}

async function backfillTodos(limit: number, dryRun: boolean): Promise<BackfillStats> {
  const rows = await db
    .select({
      id: todos.id,
      originalText: todos.originalText,
      title: todos.title,
      content: todos.content,
    })
    .from(todos)
    .where(or(isNull(todos.title), isNull(todos.content)))
    .orderBy(asc(todos.createdAt))
    .limit(limit)

  let updated = 0
  let skipped = 0

  for (const row of rows) {
    const derived = deriveTodoStructuredBackfill({ originalText: row.originalText })
    const patch = {
      ...(row.title === null && derived.title !== null ? { title: derived.title } : {}),
      ...(row.content === null && derived.content !== null ? { content: derived.content } : {}),
    }

    if (Object.keys(patch).length === 0) {
      skipped += 1
      continue
    }

    updated += 1
    if (!dryRun) {
      await db.update(todos).set({ ...patch, updatedAt: now() }).where(eq(todos.id, row.id))
    }
  }

  return { scanned: rows.length, updated, skipped }
}

async function backfillBookmarks(limit: number, dryRun: boolean): Promise<BackfillStats> {
  const rows = await db
    .select({
      id: bookmarks.id,
      originalText: bookmarks.originalText,
      title: bookmarks.title,
      note: bookmarks.note,
      summary: bookmarks.summary,
      url: bookmarks.url,
      bookmarkMeta: bookmarks.bookmarkMeta,
    })
    .from(bookmarks)
    .where(or(isNull(bookmarks.title), isNull(bookmarks.note), isNull(bookmarks.summary)))
    .orderBy(asc(bookmarks.createdAt))
    .limit(limit)

  let updated = 0
  let skipped = 0

  for (const row of rows) {
    const derived = deriveBookmarkStructuredBackfill({
      originalText: row.originalText,
      url: row.url,
      bookmarkMeta: row.bookmarkMeta,
    })
    const patch = {
      ...(row.title === null && derived.title !== null ? { title: derived.title } : {}),
      ...(row.note === null && derived.note !== null ? { note: derived.note } : {}),
      ...(row.summary === null && derived.summary !== null ? { summary: derived.summary } : {}),
    }

    if (Object.keys(patch).length === 0) {
      skipped += 1
      continue
    }

    updated += 1
    if (!dryRun) {
      await db.update(bookmarks).set({ ...patch, updatedAt: now() }).where(eq(bookmarks.id, row.id))
    }
  }

  return { scanned: rows.length, updated, skipped }
}

export async function backfillStructuredAssetFields(input?: {
  limitPerType?: number
  dryRun?: boolean
}): Promise<BackfillResult> {
  const limitPerType = input?.limitPerType ?? 100
  const dryRun = input?.dryRun ?? false

  return {
    notes: await backfillNotes(limitPerType, dryRun),
    todos: await backfillTodos(limitPerType, dryRun),
    bookmarks: await backfillBookmarks(limitPerType, dryRun),
    dryRun,
    limitPerType,
  }
}
