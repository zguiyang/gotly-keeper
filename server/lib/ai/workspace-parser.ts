import 'server-only'

import { buildAssetInterpreterPrompt } from './ai.prompts'
import { parsedCommandSchema } from './ai-schema'
import { runAiGeneration } from './ai-runner'

import type { ParsedCommand, SummaryCommandPayload } from './ai-schema'

const LOW_CONFIDENCE_THRESHOLD = 0.5
const URL_REGEX = /https?:\/\/[^\s]+/i
const TODO_KEYWORDS = ['记得', '提醒', '待办', '要', '处理', '发', '提交', '整理', '预订', '回复']
const SEARCH_KEYWORDS = ['找', '查', '搜索', '搜', '在哪', '哪里', '回忆', '看看']
const SUMMARY_KEYWORDS = ['总结', '汇总', '复盘', '梳理', '归纳', '回顾']
const NOTE_KEYWORDS = ['笔记', '想法', '备忘', '灵感', '记录']
const BOOKMARK_KEYWORDS = ['收藏', '书签', '链接', '网址', '文章', '网页', 'url']
const TODO_TARGET_KEYWORDS = ['待办', 'todo', '任务', '未完成']
const TIME_HINT_REGEX = /(今天|明天|后天|昨天|今晚|明早|下午|晚上|本周|上周|下周|最近|周[一二三四五六日天]|\d{1,2}点)/

type ParsedCommandAssetType = 'todo' | 'note' | 'link'

function normalizeInput(input: string): string {
  const trimmed = input.trim()
  return trimmed || input
}

function withPreservedInput(command: ParsedCommand, originalText: string): ParsedCommand {
  return parsedCommandSchema.parse({
    ...command,
    originalText,
    rawInput: originalText,
  })
}

function extractUrl(text: string): string | null {
  return text.match(URL_REGEX)?.[0] ?? null
}

function detectTimeHint(text: string): string | null {
  return text.match(TIME_HINT_REGEX)?.[0] ?? null
}

function detectSearchTypeHint(text: string): ParsedCommandAssetType | null {
  if (BOOKMARK_KEYWORDS.some((keyword) => text.includes(keyword))) {
    return 'link'
  }

  if (TODO_TARGET_KEYWORDS.some((keyword) => text.includes(keyword))) {
    return 'todo'
  }

  if (NOTE_KEYWORDS.some((keyword) => text.includes(keyword))) {
    return 'note'
  }

  return null
}

function detectSummaryTarget(text: string): SummaryCommandPayload['target'] {
  if (TODO_TARGET_KEYWORDS.some((keyword) => text.includes(keyword))) {
    return 'todos'
  }

  if (BOOKMARK_KEYWORDS.some((keyword) => text.includes(keyword))) {
    return 'bookmarks'
  }

  if (NOTE_KEYWORDS.some((keyword) => text.includes(keyword))) {
    return 'notes'
  }

  return null
}

function hasTodoIntent(text: string): boolean {
  return TODO_KEYWORDS.some((keyword) => text.includes(keyword))
}

function hasSearchIntent(text: string): boolean {
  return SEARCH_KEYWORDS.some((keyword) => text.includes(keyword)) || text.includes('?') || text.includes('？')
}

function hasSummaryIntent(text: string): boolean {
  return SUMMARY_KEYWORDS.some((keyword) => text.includes(keyword))
}

function buildFallbackCommand(originalText: string, confidence: number): ParsedCommand {
  const url = extractUrl(originalText)
  const timeHint = detectTimeHint(originalText)

  if (hasSummaryIntent(originalText)) {
    return parsedCommandSchema.parse({
      confidence,
      originalText,
      rawInput: originalText,
      intent: 'summarize',
      operation: 'summarize_workspace',
      assetType: null,
      todo: null,
      note: null,
      bookmark: null,
      search: null,
      summary: {
        target: detectSummaryTarget(originalText),
        query: originalText,
      },
    })
  }

  if (hasSearchIntent(originalText)) {
    return parsedCommandSchema.parse({
      confidence,
      originalText,
      rawInput: originalText,
      intent: 'search',
      operation: 'search_assets',
      assetType: null,
      todo: null,
      note: null,
      bookmark: null,
      search: {
        query: originalText,
        typeHint: detectSearchTypeHint(originalText),
        timeHint,
        completionHint: null,
      },
      summary: null,
    })
  }

  if (url && (hasTodoIntent(originalText) || timeHint)) {
    return parsedCommandSchema.parse({
      confidence,
      originalText,
      rawInput: originalText,
      intent: 'create',
      operation: 'create_todo',
      assetType: 'todo',
      todo: {
        title: originalText,
        content: null,
        timeText: timeHint,
        dueAtIso: null,
      },
      note: null,
      bookmark: null,
      search: null,
      summary: null,
    })
  }

  if (url) {
    return parsedCommandSchema.parse({
      confidence,
      originalText,
      rawInput: originalText,
      intent: 'create',
      operation: 'create_link',
      assetType: 'link',
      todo: null,
      note: null,
      bookmark: {
        url,
        title: null,
        note: null,
        summary: null,
      },
      search: null,
      summary: null,
    })
  }

  if (hasTodoIntent(originalText) || timeHint) {
    return parsedCommandSchema.parse({
      confidence,
      originalText,
      rawInput: originalText,
      intent: 'create',
      operation: 'create_todo',
      assetType: 'todo',
      todo: {
        title: originalText,
        content: null,
        timeText: timeHint,
        dueAtIso: null,
      },
      note: null,
      bookmark: null,
      search: null,
      summary: null,
    })
  }

  return parsedCommandSchema.parse({
    confidence,
    originalText,
    rawInput: originalText,
    intent: 'create',
    operation: 'create_note',
    assetType: 'note',
    todo: null,
    note: {
      title: null,
      content: originalText,
      summary: null,
    },
    bookmark: null,
    search: null,
    summary: null,
  })
}

// Parser output is intentionally parser-local for now and must not be treated as
// an execution-ready workspace contract before the main workspace flow is wired.
export async function parseWorkspaceCommand(input: string): Promise<ParsedCommand> {
  const originalText = normalizeInput(input)

  try {
    const userPrompt = await buildAssetInterpreterPrompt(originalText)
    const result = await runAiGeneration({
      schema: parsedCommandSchema,
      systemPrompt: 'Return exactly one ParsedCommand JSON object.',
      userPrompt,
    })

    if (!result.success) {
      return buildFallbackCommand(originalText, 0)
    }

    const normalized = withPreservedInput(result.data, originalText)
    if (normalized.confidence < LOW_CONFIDENCE_THRESHOLD) {
      return buildFallbackCommand(originalText, normalized.confidence)
    }

    return normalized
  } catch {
    return buildFallbackCommand(originalText, 0)
  }
}
