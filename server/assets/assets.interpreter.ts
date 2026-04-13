import 'server-only'

import { generateText, Output } from 'ai'

import { aiAssetInputSchema, type AiAssetInput } from './assets.ai.schema'
import { getAssetInputLanguageModel } from './assets.ai-provider'
import {
  classifyAssetInput,
  extractUrl,
  hasTodoIntent,
  type AssetInputType,
} from './assets.classifier'
import { parseAssetTimeText } from './assets.time'

const ASSET_INPUT_MODEL_TIMEOUT_MS = 5_000
const ASSET_INPUT_TIME_ZONE = 'Asia/Shanghai'

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

function interpretWithRuleFallback(text: string): AssetInputCommand {
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
  const parsedDueAt = dueAtIso ? new Date(dueAtIso) : null
  const safeAiDueAt =
    parsedDueAt && !Number.isNaN(parsedDueAt.getTime()) ? parsedDueAt : null

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

const SYSTEM_PROMPT = `You are a workspace input classifier for a personal productivity app called Gotly.

Classify the user input into exactly one of these intents:
- create_note: Save a thought, idea, or general note
- create_link: Bookmark a URL or share an article
- create_todo: Remind the user to do something, including tasks with deadlines
- search_assets: Look for previously saved notes, links, or todos

Rules:
- Preserve the original text exactly as provided (after trimming)
- Keep Chinese user intent (用户输入中文就按中文理解)
- Do NOT invent URLs - only set url when the user explicitly provides one
- Only set dueAtIso when the time expression is explicit (e.g., "明天上午", "下周三下午3点")
- Use search_assets for question-like queries like "我上次收藏的文章在哪" or "查找关于X的内容"
- Use create_note for ambiguous statements that don't clearly fit other categories
- For links with todo-like context (e.g., "提醒我看看这个 https://..."), prefer create_todo if there's a time hint, otherwise create_link
- Treat the current date and time provided by the user message as the only basis for resolving relative dates
- Resolve relative dates in the Asia/Shanghai time zone
- If a relative time cannot be resolved safely, set dueAtIso to null and preserve the expression in timeText

Return a confidence score between 0 and 1:
- 0.9-1.0: Very confident in the classification
- 0.7-0.9: Confident
- 0.5-0.7: Somewhat confident, but unclear
- Below 0.5: Too uncertain, will fallback to rule-based classifier`

function buildPrompt(trimmed: string, now = new Date()) {
  const localDateTime = new Intl.DateTimeFormat('zh-CN', {
    timeZone: ASSET_INPUT_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(now)

  return [
    `Current server timestamp: ${now.toISOString()}`,
    `Current date and time in ${ASSET_INPUT_TIME_ZONE}: ${localDateTime}`,
    `User input: ${JSON.stringify(trimmed)}`,
  ].join('\n')
}

export async function interpretAssetInput(
  text: string
): Promise<AssetInputCommand> {
  const trimmed = text.trim()

  if (!trimmed) {
    return interpretWithRuleFallback(trimmed)
  }

  const deterministicUrl = extractUrl(trimmed)

  const model = getAssetInputLanguageModel()
  if (!model) {
    return interpretWithRuleFallback(trimmed)
  }

  try {
    const result = await generateText({
      model,
      output: Output.object({ schema: aiAssetInputSchema }),
      system: SYSTEM_PROMPT,
      prompt: buildPrompt(trimmed),
      temperature: 0,
      maxRetries: 1,
      timeout: ASSET_INPUT_MODEL_TIMEOUT_MS,
      providerOptions: {
        alibaba: {
          enableThinking: false,
        },
      },
    })

    const normalized = normalizeAiResponse(result.output, deterministicUrl, trimmed)
    if (normalized) {
      return normalized
    }

    return interpretWithRuleFallback(trimmed)
  } catch {
    return interpretWithRuleFallback(trimmed)
  }
}
