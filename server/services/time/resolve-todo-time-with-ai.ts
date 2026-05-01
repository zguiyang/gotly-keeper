import 'server-only'

import { generateText, Output, stepCountIs } from 'ai'
import { z } from 'zod'

import { getAiProvider } from '@/server/lib/ai/ai-provider'
import { parseAiError } from '@/server/lib/ai/ai.errors'
import { buildWorkspaceSystemPrompt } from '@/server/lib/ai/ai.prompts'
import { ASSET_INPUT_MODEL_TIMEOUT_MS } from '@/server/lib/config/constants'
import { renderPrompt } from '@/server/lib/prompt-template'
import { ASIA_SHANGHAI_TIME_ZONE } from '@/shared/time/dayjs'

import { todoTimeTools } from './todo-time-tools'

const todoTimeResolutionSchema = z.object({
  timeText: z.string().nullable(),
  dueAt: z.string().nullable(),
})

type TodoTimeSourceSlot =
  | 'timeText'
  | 'due'
  | 'time'
  | 'dueAt'
  | 'dueDate'
  | 'dueText'
  | 'dueTime'
  | 'fallbackTimeHint'

export type ResolveTodoTimeWithAiInput = {
  title: string
  slots?: Record<string, string | undefined>
  fallbackTimeHint?: string | null
  referenceTime: string
  timezone?: string
  signal?: AbortSignal
}

export type ResolvedTodoTimeWithAi = z.infer<typeof todoTimeResolutionSchema>

function getTrimmedValue(value: string | null | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function getSourceTimeText(input: ResolveTodoTimeWithAiInput): {
  timeText: string | null
  sourceSlot: TodoTimeSourceSlot | null
} {
  const values: Array<[TodoTimeSourceSlot, string | null]> = [
    ['timeText', getTrimmedValue(input.slots?.timeText)],
    ['due', getTrimmedValue(input.slots?.due)],
    ['time', getTrimmedValue(input.slots?.time)],
    ['dueTime', getTrimmedValue(input.slots?.dueTime)],
    ['dueText', getTrimmedValue(input.slots?.dueText)],
    ['dueDate', getTrimmedValue(input.slots?.dueDate)],
    ['fallbackTimeHint', getTrimmedValue(input.fallbackTimeHint)],
  ]

  for (const [sourceSlot, value] of values) {
    if (value) {
      return { timeText: value, sourceSlot }
    }
  }

  return { timeText: null, sourceSlot: null }
}

function normalizeDueAtValue(value: string | undefined) {
  const dueAt = getTrimmedValue(value)
  if (!dueAt) {
    return null
  }

  const parsed = new Date(dueAt)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  return parsed.toISOString()
}

export async function resolveTodoTimeWithAi(
  input: ResolveTodoTimeWithAiInput
): Promise<ResolvedTodoTimeWithAi> {
  const timezone = input.timezone ?? ASIA_SHANGHAI_TIME_ZONE
  const preservedSource = getSourceTimeText(input)
  const normalizedDueAt = normalizeDueAtValue(input.slots?.dueAt)

  if (normalizedDueAt) {
    return {
      timeText: preservedSource.timeText,
      dueAt: normalizedDueAt,
    }
  }

  const model = getAiProvider()
  if (!model) {
    return {
      timeText: preservedSource.timeText,
      dueAt: null,
    }
  }

  const [systemPrompt, userPrompt] = await Promise.all([
    buildWorkspaceSystemPrompt('workspace-agent/todo-time-resolver.system', {}),
    renderPrompt('workspace-agent/todo-time-resolver.user', {
      payloadJson: JSON.stringify({
        title: input.title,
        slots: input.slots ?? {},
        fallbackTimeHint: input.fallbackTimeHint ?? null,
        referenceTime: input.referenceTime,
        timezone,
      }),
    }),
  ])

  try {
    const result = await generateText({
      model,
      output: Output.object({ schema: todoTimeResolutionSchema }),
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0,
      maxRetries: 1,
      timeout: ASSET_INPUT_MODEL_TIMEOUT_MS,
      abortSignal: input.signal,
      stopWhen: stepCountIs(5),
      tools: todoTimeTools,

      providerOptions: {
        alibaba: {
          enableThinking: false,
        },
      },
    })

    const parsed = todoTimeResolutionSchema.parse(result.output)
    return {
      timeText: parsed.timeText,
      dueAt: parsed.dueAt ? new Date(parsed.dueAt).toISOString() : null,
    }
  } catch (error) {
    console.warn('[todo-time-ai] resolution failed, returning no due date', {
      error: parseAiError(error).message,
    })

    return {
      timeText: preservedSource.timeText,
      dueAt: null,
    }
  }
}
