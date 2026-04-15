/**
 * @deprecated This file is FROZEN and will be removed in a future phase.
 * 
 * Canonical owner: server/notes/notes.summary.service.ts
 * 
 * DO NOT modify this file for bug fixes or enhancements.
 * All changes MUST be made to the canonical owner file only.
 * 
 * This file exists solely for backward compatibility during migration.
 */

import 'server-only'

import { generateText, Output } from 'ai'

import { getAiProvider } from '@/server/ai/ai-provider'
import { listNoteAssets } from './assets.service'
import {
  NOTE_SUMMARY_LIMIT,
  buildNoteSummaryPromptInput,
} from './assets.note-summary.pure'
import {
  noteSummaryOutputSchema,
  type NoteSummaryOutput,
} from './assets.note-summary.schema'
import {
  type AssetListItem,
  type NoteSummaryResult,
  type NoteSummarySource,
} from '@/shared/assets/assets.types'
import { NOTE_SUMMARY_MODEL_TIMEOUT_MS } from '@/server/config/constants'

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
  const sourceAssetIds = output.sourceAssetIds.filter((id) => validIds.has(id))
  const fallbackIds = notes.slice(0, 5).map((note) => note.id)
  const finalSourceIds = sourceAssetIds.length ? sourceAssetIds : fallbackIds

  return {
    headline: output.headline,
    summary: output.summary,
    keyPoints: output.keyPoints,
    sourceAssetIds: finalSourceIds,
    sources: mapSummarySources(notes, finalSourceIds),
    generatedAt: new Date(),
  }
}

const NOTE_SUMMARY_SYSTEM_PROMPT = `You generate a short Chinese summary for a user's recent notes.

Rules:
- Use only the provided note records.
- Do not invent facts, projects, deadlines, or context.
- Keep the tone concise and practical.
- Return sourceAssetIds that refer only to provided note ids.
- If there are no notes, say there is nothing to summarize.`

export async function summarizeRecentNotes(userId: string): Promise<NoteSummaryResult> {
  const notes = await listNoteAssets(userId, NOTE_SUMMARY_LIMIT)

  if (notes.length === 0) {
    return normalizeNoteSummaryOutput(getFallbackNoteSummary(notes), notes)
  }

  const model = getAiProvider()
  if (!model) {
    return normalizeNoteSummaryOutput(getFallbackNoteSummary(notes), notes)
  }

  try {
    const result = await generateText({
      model,
      output: Output.object({ schema: noteSummaryOutputSchema }),
      system: NOTE_SUMMARY_SYSTEM_PROMPT,
      prompt: JSON.stringify({
        currentTime: new Date().toISOString(),
        notes: buildNoteSummaryPromptInput(notes),
      }),
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
    console.warn('[assets.note-summary] AI summary failed; using fallback', {
      error: error instanceof Error ? error.message : String(error),
    })
    return normalizeNoteSummaryOutput(getFallbackNoteSummary(notes), notes)
  }
}