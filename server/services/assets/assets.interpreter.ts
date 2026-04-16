import 'server-only'

import { runAiGeneration } from '@/server/lib/ai/ai-runner'
import { aiAssetInputSchema, type AiAssetInput } from '@/server/lib/ai/ai-schema'
import { buildAssetInterpreterPrompt } from '@/server/lib/ai/ai.prompts'
import { dayjs } from '@/shared/time/dayjs'

import {
  classifyAssetInput,
  extractUrl,
  hasTodoIntent,
  type AssetInputType,
} from './assets.classifier'
import {
  detectExplicitSummaryIntent,
  resolveExplicitSummaryTarget,
  type AssetSummaryTarget,
} from './assets.summary-intent.pure'
import { parseAssetTimeText } from './assets.time'

export type AssetInputCommand =
  | {
      intent: 'create_note'
      originalText: string
      timeText: string | null
      dueAt: Date | null
      confidence: number
    }
  | {
      intent: 'create_link'
      originalText: string
      url: string
      timeText: string | null
      dueAt: Date | null
      confidence: number
    }
  | {
      intent: 'create_todo'
      originalText: string
      url: string | null
      timeText: string | null
      dueAt: Date | null
      confidence: number
    }
  | {
      intent: 'search_assets'
      query: string
      typeHint: AssetInputType | null
      timeHint: string | null
      completionHint: 'complete' | 'incomplete' | null
      confidence: number
    }
  | {
      intent: 'summarize_assets'
      summaryTarget: AssetSummaryTarget
      query: string
      confidence: number
    }

function interpretWithRuleFallback(text: string): AssetInputCommand {
  const summaryIntent = detectExplicitSummaryIntent(text)
  if (summaryIntent) {
    return {
      intent: 'summarize_assets',
      summaryTarget: summaryIntent.summaryTarget,
      query: text,
      confidence: 1,
    }
  }

  const classification = classifyAssetInput(text)

  if (classification.kind === 'query') {
    return {
      intent: 'search_assets',
      query: text,
      typeHint: null,
      timeHint: null,
      completionHint: null,
      confidence: 1,
    }
  }

  if (classification.type === 'link') {
    return {
      intent: 'create_link',
      originalText: text,
      url: classification.url!,
      timeText: classification.timeText,
      dueAt: classification.dueAt,
      confidence: 1,
    }
  }

  if (classification.type === 'todo') {
    return {
      intent: 'create_todo',
      originalText: text,
      url: classification.url,
      timeText: classification.timeText,
      dueAt: classification.dueAt,
      confidence: 1,
    }
  }

  return {
    intent: 'create_note',
    originalText: text,
    timeText: classification.timeText,
    dueAt: classification.dueAt,
    confidence: 1,
  }
}

function normalizeAiTime(
  originalText: string,
  aiTimeText: string | null,
  dueAtIso: string | null
) {
  const parsedFromText = parseAssetTimeText(aiTimeText || originalText)
  const parsedDueAt = dueAtIso ? dayjs(dueAtIso) : null
  const safeAiDueAt = parsedDueAt?.isValid() ? parsedDueAt.toDate() : null

  return {
    timeText: aiTimeText ?? parsedFromText.timeText,
    dueAt: safeAiDueAt ?? parsedFromText.dueAt,
  }
}

function normalizeAiResponse(
  aiOutput: AiAssetInput,
  deterministicUrl: string | null,
  originalText: string
): AssetInputCommand | null {
  const { intent, confidence } = aiOutput

  if (confidence < 0.5) {
    return null
  }

  if (deterministicUrl && !(intent === 'create_todo' && hasTodoIntent(originalText))) {
    const normalizedTime = normalizeAiTime(
      originalText,
      aiOutput.timeText ?? null,
      aiOutput.dueAtIso
    )
    return {
      intent: 'create_link',
      originalText,
      url: deterministicUrl,
      timeText: normalizedTime.timeText,
      dueAt: normalizedTime.dueAt,
      confidence,
    }
  }

  if (intent === 'summarize_assets') {
    const summaryTarget = resolveExplicitSummaryTarget(originalText)

    if (!summaryTarget) return null
    if (deterministicUrl) return null

    return {
      intent: 'summarize_assets',
      summaryTarget,
      query: aiOutput.query?.trim() || originalText,
      confidence,
    }
  }

  if (intent === 'search_assets') {
    const normalizedTime = normalizeAiTime(
      originalText,
      aiOutput.timeText ?? null,
      aiOutput.dueAtIso
    )
    return {
      intent: 'search_assets',
      query: aiOutput.query?.trim() || originalText,
      typeHint: aiOutput.typeHint ?? null,
      timeHint: normalizedTime.timeText,
      completionHint: aiOutput.completionHint ?? null,
      confidence,
    }
  }

  if (intent === 'create_link') {
    const url = deterministicUrl ?? aiOutput.url
    if (!url) return null

    const normalizedTime = normalizeAiTime(
      originalText,
      aiOutput.timeText ?? null,
      aiOutput.dueAtIso
    )
    return {
      intent: 'create_link',
      originalText,
      url,
      timeText: normalizedTime.timeText,
      dueAt: normalizedTime.dueAt,
      confidence,
    }
  }

  if (intent === 'create_todo') {
    const normalizedTime = normalizeAiTime(
      originalText,
      aiOutput.timeText ?? null,
      aiOutput.dueAtIso
    )
    return {
      intent: 'create_todo',
      originalText,
      url: deterministicUrl ?? aiOutput.url ?? null,
      timeText: normalizedTime.timeText,
      dueAt: normalizedTime.dueAt,
      confidence,
    }
  }

  if (intent === 'create_note') {
    const normalizedTime = normalizeAiTime(
      originalText,
      aiOutput.timeText ?? null,
      aiOutput.dueAtIso
    )
    return {
      intent: 'create_note',
      originalText,
      timeText: normalizedTime.timeText,
      dueAt: normalizedTime.dueAt,
      confidence,
    }
  }

  return null
}

export async function interpretAssetInput(
  text: string
): Promise<AssetInputCommand> {
  const trimmed = text.trim()

  if (!trimmed) {
    return interpretWithRuleFallback(trimmed)
  }

  const deterministicUrl = extractUrl(trimmed)

  const fullPrompt = await buildAssetInterpreterPrompt(trimmed)

  const result = await runAiGeneration({
    schema: aiAssetInputSchema,
    systemPrompt: '',
    userPrompt: fullPrompt,
  })

  if (!result.success) {
    return interpretWithRuleFallback(trimmed)
  }

  const normalized = normalizeAiResponse(
    result.data as AiAssetInput,
    deterministicUrl,
    trimmed
  )

  if (normalized) {
    return normalized
  }

  return interpretWithRuleFallback(trimmed)
}
