import 'server-only'

import { z } from 'zod'

import { listNotes } from '@/server/services/notes'
import { searchAssets } from '@/server/services/search/assets-search.service'
import { toAssetListItemFromNote } from '@/server/services/workspace/asset-list-item'
import { dayjs } from '@/shared/time/dayjs'

import { NOTE_SUMMARY_LIMIT, NOTE_SUMMARY_MODEL_TIMEOUT_MS } from '../../lib/config/constants'

import {
  buildWorkspaceAssetPromptInput,
  generateWorkspaceInsight,
} from './asset-insight'

import type { AssetListItem, NoteSummaryResult } from '@/shared/assets/assets.types'

type NoteSummaryPromptItem = {
  id: string
  text: string
  createdAt: string
}

export function buildNoteSummaryPromptInput(notes: AssetListItem[]): NoteSummaryPromptItem[] {
  return buildWorkspaceAssetPromptInput({
    assets: notes,
    limit: NOTE_SUMMARY_LIMIT,
    mapAsset: (note) => ({
      id: note.id,
      text: note.originalText,
      createdAt: dayjs(note.createdAt).toISOString(),
    }),
  })
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
    keyPoints: notes
      .slice(0, 3)
      .map((note) => note.excerpt || note.originalText)
      .map((text) => text.split('\n').find((line) => line.trim().length > 0)?.trim() || text)
      .map((text) => text.slice(0, 140)),
    sourceAssetIds: notes.slice(0, 5).map((note) => note.id),
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
    : (await listNotes({ userId, limit: NOTE_SUMMARY_LIMIT })).map(toAssetListItemFromNote)

  return generateWorkspaceInsight({
    assets: notes,
    buildPromptInput: buildNoteSummaryPromptInput,
    fallbackOutput: getFallbackNoteSummary,
    schema: noteSummaryOutputSchema,
    promptKey: 'workspace/note-summary',
    promptPayloadKey: 'notes',
    timeoutMs: NOTE_SUMMARY_MODEL_TIMEOUT_MS,
    logTag: 'notes.summary',
    logLabel: 'summary',
    normalizeResult: (output, context) => {
      return {
        headline: output.headline,
        summary: output.summary,
        keyPoints: output.keyPoints,
        sourceAssetIds: context.sourceAssetIds,
        sources: context.sources,
        generatedAt: context.generatedAt,
      }
    },
  })
}
