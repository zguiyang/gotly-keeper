import 'server-only'

import { generateText, Output } from 'ai'
import { z } from 'zod'

import { renderPrompt } from '@/server/lib/prompt-template'
import { listNotes } from '@/server/services/notes'
import { searchAssets } from '@/server/services/search/assets-search.service'
import { nowIso, dayjs } from '@/shared/time/dayjs'

import { getAiProvider } from '../../lib/ai/ai-provider'
import { NOTE_SUMMARY_LIMIT, NOTE_SUMMARY_MODEL_TIMEOUT_MS } from '../../lib/config/constants'

import type { NoteListItem } from '@/server/services/notes'
import type { AssetListItem, NoteSummaryResult, NoteSummarySource } from '@/shared/assets/assets.types'

type NoteSummaryPromptItem = {
  id: string
  text: string
  createdAt: string
}

function toAssetListItem(note: NoteListItem): AssetListItem {
  return {
    id: note.id,
    originalText: note.originalText,
    title: note.title,
    excerpt: note.excerpt,
    type: 'note',
    url: null,
    timeText: null,
    dueAt: null,
    completed: false,
    bookmarkMeta: null,
    lifecycleStatus: note.lifecycleStatus,
    archivedAt: note.archivedAt,
    trashedAt: note.trashedAt,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  }
}

export function buildNoteSummaryPromptInput(notes: AssetListItem[]): NoteSummaryPromptItem[] {
  return notes.slice(0, NOTE_SUMMARY_LIMIT).map((note) => ({
    id: note.id,
    text: note.originalText,
    createdAt: dayjs(note.createdAt).toISOString(),
  }))
}

const noteSummaryOutputSchema = z.object({
  headline: z.string().min(1).max(80),
  summary: z.string().min(1).max(700),
  keyPoints: z.array(z.string().min(1).max(140)).max(6),
  sourceAssetIds: z.array(z.string().min(1)).min(1).max(10),
})

type NoteSummaryOutput = z.infer<typeof noteSummaryOutputSchema>

function getFallbackNoteSummary(notes: AssetListItem[]): NoteSummaryOutput {
  return {
    headline: '最近笔记摘要',
    summary: notes.length
      ? `最近有 ${notes.length} 条笔记，先回看最靠前的几条内容。`
      : '目前没有可总结的笔记。',
    keyPoints: notes.slice(0, 3).map((note) => note.title),
    sourceAssetIds: notes.slice(0, 5).map((note) => note.id),
  }
}

function mapSummarySources(
  notes: AssetListItem[],
  sourceAssetIds: string[]
): NoteSummarySource[] {
  const requested = new Set(sourceAssetIds)
  return notes
    .filter((note) => requested.has(note.id))
    .map((note) => ({
      id: note.id,
      title: note.title,
      createdAt: note.createdAt,
    }))
}

function normalizeNoteSummaryOutput(
  output: NoteSummaryOutput,
  notes: AssetListItem[]
): NoteSummaryResult {
  const validIds = new Set(notes.map((note) => note.id))
  const filteredSourceIds = output.sourceAssetIds.filter((id) => validIds.has(id))
  const fallbackIds = notes.slice(0, 5).map((note) => note.id)
  const finalSourceIds = filteredSourceIds.length ? filteredSourceIds : fallbackIds

  return {
    headline: output.headline,
    summary: output.summary,
    keyPoints: output.keyPoints,
    sourceAssetIds: finalSourceIds,
    sources: mapSummarySources(notes, finalSourceIds),
    generatedAt: dayjs().toDate(),
  }
}

export async function summarizeWorkspaceRecentNotesInternal(
  userId: string,
  query?: string | null
): Promise<NoteSummaryResult> {
  const trimmedQuery = query?.trim()
  const notes = trimmedQuery
    ? (await searchAssets({
        userId,
        query: trimmedQuery,
        typeHint: 'note',
        limit: NOTE_SUMMARY_LIMIT,
      })).filter((asset) => asset.type === 'note')
    : (await listNotes({ userId, limit: NOTE_SUMMARY_LIMIT })).map(toAssetListItem)

  if (notes.length === 0) {
    return normalizeNoteSummaryOutput(getFallbackNoteSummary(notes), notes)
  }

  const model = getAiProvider()
  if (!model) {
    return normalizeNoteSummaryOutput(getFallbackNoteSummary(notes), notes)
  }

  try {
    const [systemPrompt, userPrompt] = await Promise.all([
      renderPrompt('workspace/note-summary.system', {}),
      renderPrompt('workspace/note-summary.user', {
        payloadJson: JSON.stringify({
          currentTime: nowIso(),
          notes: buildNoteSummaryPromptInput(notes),
        }),
      }),
    ])

    const result = await generateText({
      model,
      output: Output.object({ schema: noteSummaryOutputSchema }),
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0,
      maxRetries: 1,
      timeout: NOTE_SUMMARY_MODEL_TIMEOUT_MS,
      providerOptions: {
        alibaba: {
          enableThinking: false,
        },
      },
    })

    return normalizeNoteSummaryOutput(result.output, notes)
  } catch (error) {
    console.warn('[notes.summary] AI summary failed; using fallback', {
      error: error instanceof Error ? error.message : String(error),
    })
    return normalizeNoteSummaryOutput(getFallbackNoteSummary(notes), notes)
  }
}
