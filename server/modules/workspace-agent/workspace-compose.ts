import 'server-only'

import { z } from 'zod'

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

function buildPromptPayload(task: WorkspaceTask, plan: WorkspaceExecutionPlan, data: WorkspaceToolResult) {
  if (!data.ok) {
    return {
      task,
      plan,
      data,
    }
  }

  return {
    task,
    plan,
    data: {
      ok: true,
      target: data.target,
      total: data.total ?? (Array.isArray(data.items) ? data.items.length : 0),
      action: data.action ?? null,
      items: Array.isArray(data.items)
        ? data.items.filter(isAssetListItem).slice(0, 8).map(toPromptAssetItem)
        : [],
      item: isAssetListItem(data.item) ? toPromptAssetItem(data.item) : null,
    },
  }
}

function getTargetLabel(task: WorkspaceTask, data: WorkspaceToolResult) {
  const target = task.target ?? (data.ok ? data.target : 'mixed')

  if (target === 'notes') {
    return '笔记'
  }

  if (target === 'todos') {
    return '待办'
  }

  if (target === 'bookmarks') {
    return '书签'
  }

  return '内容'
}

function buildFallbackAnswer(task: WorkspaceTask, data: WorkspaceToolResult) {
  if (!data.ok) {
    return data.message
  }

  const targetLabel = getTargetLabel(task, data)
  const total = data.total ?? data.items?.length ?? 0

  if (task.intent === 'query') {
    return `已找到 ${total} 条${targetLabel}。`
  }

  if (task.intent === 'summarize') {
    return total > 0
      ? `已整理 ${total} 条${targetLabel}，下面是重点结果。`
      : `目前没有可整理的${targetLabel}。`
  }

  if (task.intent === 'create') {
    return `已创建${targetLabel}。`
  }

  return `已更新${targetLabel}。`
}

export async function composeWorkspaceAnswer(input: {
  task: WorkspaceTask
  plan: WorkspaceExecutionPlan
  data: WorkspaceToolResult
  signal?: AbortSignal
}): Promise<WorkspaceComposeResult> {
  const fallbackAnswer = buildFallbackAnswer(input.task, input.data)

  if (!input.data.ok) {
    return {
      answer: fallbackAnswer,
      usedFallback: true,
    }
  }

  try {
    const payload = buildPromptPayload(input.task, input.plan, input.data)
    const [systemPrompt, userPrompt] = await Promise.all([
      buildWorkspaceSystemPrompt('workspace-agent/compose.system', {}),
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

    return {
      answer: result.data.answer,
      usedFallback: false,
    }
  } catch {
    return {
      answer: fallbackAnswer,
      usedFallback: true,
    }
  }
}

export { buildFallbackAnswer }
