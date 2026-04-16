import 'server-only'

import { generateText, Output } from 'ai'
import { z } from 'zod'

import { listNoteAssets } from '@/server/services/assets/assets.service'
import { nowIso, dayjs } from '@/shared/time/dayjs'

import { getAiProvider } from '../../lib/ai/ai-provider'
import { NOTE_SUMMARY_LIMIT, NOTE_SUMMARY_MODEL_TIMEOUT_MS } from '../../lib/config/constants'

import type { AssetListItem, NoteSummaryResult, NoteSummarySource } from '@/shared/assets/assets.types'

type NoteSummaryPromptItem = {
  id: string
  text: string
  createdAt: string
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

const NOTE_SUMMARY_SYSTEM_PROMPT = `You generate a short Chinese summary for a user's recent notes.

Rules:
- Use only the provided note records.
- Do not invent facts, projects, deadlines, or context.
- Keep the tone concise and practical.
- Return sourceAssetIds that refer only to provided note ids.
- If there are no notes, say there is nothing to summarize.`

export async function summarizeWorkspaceRecentNotesInternal(
  userId: string
): Promise<NoteSummaryResult> {
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
        currentTime: nowIso(),
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
    console.warn('[notes.summary] AI summary failed; using fallback', {
      error: error instanceof Error ? error.message : String(error),
    })
    return normalizeNoteSummaryOutput(getFallbackNoteSummary(notes), notes)
  }
}
