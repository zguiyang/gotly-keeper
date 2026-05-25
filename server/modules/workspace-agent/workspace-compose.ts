import 'server-only'

import { z } from 'zod'

import { validateComposeOutput } from '@/server/lib/ai/ai-guard'
import { runAiGeneration } from '@/server/lib/ai/ai-runner'
import { buildWorkspaceSystemPrompt } from '@/server/lib/ai/ai.prompts'
import { NOTE_SUMMARY_MODEL_TIMEOUT_MS } from '@/server/lib/config/constants'
import { renderPrompt } from '@/server/lib/prompt-template'

import type { WorkspaceExecutionPlan, WorkspaceTask, WorkspaceToolResult } from './types'
import type { AssetListItem } from '@/shared/assets/assets.types'

const workspaceComposeOutputSchema = z.object({
  answer: z.string().trim().min(1).max(600),
})

type WorkspaceComposeResult = {
  answer: string
  usedFallback: boolean
}

function isAssetListItem(value: unknown): value is AssetListItem {
  return !!value && typeof value === 'object' && 'id' in value && 'type' in value
}

function toPromptAssetItem(item: AssetListItem) {
  return {
    id: item.id,
    type: item.type,
    title: item.title,
    excerpt: item.excerpt,
    originalText: item.originalText,
    url: item.url,
    timeText: item.timeText,
    dueAt: item.dueAt?.toISOString() ?? null,
    completed: item.completed,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt?.toISOString() ?? null,
  }
}

function getSummaryTypeKey(itemType: AssetListItem['type']): 'todos' | 'notes' | 'bookmarks' {
  if (itemType === 'todo') {
    return 'todos'
  }

  if (itemType === 'note') {
    return 'notes'
  }

  return 'bookmarks'
}

function buildSummaryContext(items: ReturnType<typeof toPromptAssetItem>[]) {
  const counts = {
    todos: 0,
    notes: 0,
    bookmarks: 0,
  }
  const groups: {
    todos: ReturnType<typeof toPromptAssetItem>[]
    notes: ReturnType<typeof toPromptAssetItem>[]
    bookmarks: ReturnType<typeof toPromptAssetItem>[]
  } = {
    todos: [],
    notes: [],
    bookmarks: [],
  }

  for (const item of items) {
    const key = getSummaryTypeKey(item.type)
    counts[key] += 1
    if (groups[key].length < 3) {
      groups[key].push(item)
    }
  }

  return {
    counts,
    groups,
  }
}

function buildPromptPayload(task: WorkspaceTask, plan: WorkspaceExecutionPlan, data: WorkspaceToolResult) {
  if (!data.ok) {
    return {
      task,
      plan,
      data,
    }
  }

  const promptItems = Array.isArray(data.items)
    ? data.items.filter(isAssetListItem).slice(0, 8).map(toPromptAssetItem)
    : []

  return {
    task,
    plan,
    summaryContext: buildSummaryContext(promptItems),
    data: {
      ok: true,
      target: data.target,
      total: data.total ?? (Array.isArray(data.items) ? data.items.length : 0),
      action: data.action ?? null,
      items: promptItems,
      item: isAssetListItem(data.item) ? toPromptAssetItem(data.item) : null,
    },
  }
}

const TARGET_LABELS: Record<string, { en: string; 'zh-CN': string }> = {
  notes: { en: 'note', 'zh-CN': '笔记' },
  todos: { en: 'todo', 'zh-CN': '待办' },
  bookmarks: { en: 'bookmark', 'zh-CN': '书签' },
  mixed: { en: 'item', 'zh-CN': '内容' },
}

function getTargetLabel(target: string, locale: string = 'zh-CN'): string {
  const labels = TARGET_LABELS[target] ?? TARGET_LABELS.mixed
  return labels[locale as keyof typeof labels] ?? labels.en
}

const FALLBACK_MESSAGES: Record<string, Record<string, string>> = {
  query_empty: {
    en: 'No matching results found. Try different keywords.',
    'zh-CN': '没有找到相关内容。可以换个关键词再试试。',
  },
  query_found: {
    en: 'Found {total} {label}.',
    'zh-CN': '已找到 {total} 条{label}。',
  },
  summarize_found: {
    en: 'Summarized {total} {label}. Here are the key results.',
    'zh-CN': '已整理 {total} 条{label}，下面是重点结果。',
  },
  summarize_empty: {
    en: 'No {label} to summarize.',
    'zh-CN': '目前没有可整理的{label}。',
  },
  create_done: {
    en: '{label} created.',
    'zh-CN': '已创建{label}。',
  },
  update_done: {
    en: '{label} updated.',
    'zh-CN': '已更新{label}。',
  },
}

function buildFallbackAnswer(task: WorkspaceTask, data: WorkspaceToolResult, locale: string = 'zh-CN') {
  if (!data.ok) {
    return data.message
  }

  const target = task.target ?? (data.ok ? data.target : 'mixed')
  const targetLabel = getTargetLabel(target ?? 'mixed', locale)
  const total = data.total ?? data.items?.length ?? 0

  if (task.intent === 'query') {
    if (total === 0) {
      return FALLBACK_MESSAGES.query_empty[locale] ?? FALLBACK_MESSAGES.query_empty.en
    }
    const template = FALLBACK_MESSAGES.query_found[locale] ?? FALLBACK_MESSAGES.query_found.en
    return template.replace('{total}', String(total)).replace('{label}', targetLabel)
  }

  if (task.intent === 'summarize') {
    if (total > 0) {
      const template = FALLBACK_MESSAGES.summarize_found[locale] ?? FALLBACK_MESSAGES.summarize_found.en
      return template.replace('{total}', String(total)).replace('{label}', targetLabel)
    }
    const template = FALLBACK_MESSAGES.summarize_empty[locale] ?? FALLBACK_MESSAGES.summarize_empty.en
    return template.replace('{label}', targetLabel)
  }

  if (task.intent === 'create') {
    const template = FALLBACK_MESSAGES.create_done[locale] ?? FALLBACK_MESSAGES.create_done.en
    return template.replace('{label}', targetLabel)
  }

  const template = FALLBACK_MESSAGES.update_done[locale] ?? FALLBACK_MESSAGES.update_done.en
  return template.replace('{label}', targetLabel)
}

export async function composeWorkspaceAnswer(input: {
  task: WorkspaceTask
  plan: WorkspaceExecutionPlan
  data: WorkspaceToolResult
  locale?: string
  signal?: AbortSignal
}): Promise<WorkspaceComposeResult> {
  const defaultLocale = input.locale ?? 'en'
  const fallbackAnswer = buildFallbackAnswer(input.task, input.data, defaultLocale)

  if (!input.data.ok) {
    return {
      answer: fallbackAnswer,
      usedFallback: true,
    }
  }

  const total = input.data.total ?? input.data.items?.length ?? 0
  if ((input.task.intent === 'query' || input.task.intent === 'summarize') && total === 0) {
    return {
      answer: fallbackAnswer,
      usedFallback: true,
    }
  }

  try {
    const payload = buildPromptPayload(input.task, input.plan, input.data)
    const [systemPrompt, userPrompt] = await Promise.all([
      buildWorkspaceSystemPrompt('workspace-agent/compose.system', {}, defaultLocale),
      renderPrompt('workspace-agent/compose.user', {
        payloadJson: JSON.stringify(payload),
      }),
    ])

    const result = await runAiGeneration({
      schema: workspaceComposeOutputSchema,
      systemPrompt,
      userPrompt,
      timeoutMs: NOTE_SUMMARY_MODEL_TIMEOUT_MS,
      abortSignal: input.signal,
    })

    if (!result.success) {
      return {
        answer: fallbackAnswer,
        usedFallback: true,
      }
    }

    const guardResult = validateComposeOutput(result.data.answer)
    if (guardResult.warnings.length > 0) {
      console.warn('[compose] Content guard warnings', guardResult.warnings)
    }

    return {
      answer: guardResult.sanitized,
      usedFallback: !guardResult.passed,
    }
  } catch {
    return {
      answer: fallbackAnswer,
      usedFallback: true,
    }
  }
}

export { buildFallbackAnswer }
