import 'server-only'

import { z } from 'zod'

import { buildWorkspaceSystemPrompt } from '@/server/lib/ai/ai.prompts'
import { renderPrompt } from '@/server/lib/prompt-template'
import {
  workspaceDraftTaskSchema,
  type DraftWorkspaceTask,
  type WorkspaceUnderstandingPreview,
} from '@/shared/workspace/workspace-run-protocol'

import type { NormalizedWorkspaceRunInput } from './workspace-run-normalizer'

const commandOnlyTitleRegex = /^(帮我记一下|帮我记个待办|记一下|记个待办|帮我)[：:，,;；。\s]*$/
const genericCreateCommandOnlyTitleRegex =
  /^(帮我记一下|帮我记个待办|记一下|记个待办|帮我|存个链接|保存链接|存链接|保存个链接|记个书签|帮我记个书签)[：:，,;；。\s]*$/
const leadingPunctuationRegex = /^[：:，,;；。\s]+/
const allowedIntentSchema = z.enum([
  'create',
  'query',
  'summarize',
  'update',
])
const allowedTargetSchema = z.enum(['notes', 'todos', 'bookmarks'])
const understandingSlotEntrySchema = z.object({
  key: z.string().trim().min(1),
  value: z.string(),
})

const SLOT_KEY_ALIASES: Record<string, string> = {
  due: 'timeText',
  dueDate: 'timeText',
  dueText: 'timeText',
  dueTime: 'timeText',
}

const understandingTaskSchema = workspaceDraftTaskSchema
  .extend({
    confidence: z.number().min(0).max(1),
    intent: allowedIntentSchema,
    target: allowedTargetSchema,
    title: z.string().transform((title) => title.trim()),
  })
  .superRefine((task, ctx) => {
    if (task.title.length === 0 && (task.intent === 'query' || task.intent === 'summarize')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'task title cannot be empty for read intents',
        path: ['title'],
      })
    }

    if (commandOnlyTitleRegex.test(task.title) && (task.intent === 'query' || task.intent === 'summarize')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'task title cannot be only a command prefix',
        path: ['title'],
      })
    }

    if (task.intent === 'update' && task.target !== 'todos') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'update intent only supports todos target',
        path: ['target'],
      })
    }
  })

const understandingModelTaskSchema = workspaceDraftTaskSchema
  .omit({ slots: true })
  .extend({
    confidence: z.number().min(0).max(1),
    intent: allowedIntentSchema,
    target: allowedTargetSchema,
    title: z.string().transform((title) => title.trim()),
    slotEntries: z.array(understandingSlotEntrySchema).default([]),
  })
  .superRefine((task, ctx) => {
    if (task.title.length === 0 && (task.intent === 'query' || task.intent === 'summarize')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'task title cannot be empty for read intents',
        path: ['title'],
      })
    }

    if (commandOnlyTitleRegex.test(task.title) && (task.intent === 'query' || task.intent === 'summarize')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'task title cannot be only a command prefix',
        path: ['title'],
      })
    }

    if (task.intent === 'update' && task.target !== 'todos') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'update intent only supports todos target',
        path: ['target'],
      })
    }

    const uniqueKeys = new Set<string>()
    for (const [index, entry] of task.slotEntries.entries()) {
      if (uniqueKeys.has(entry.key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'slotEntries must not contain duplicate keys',
          path: ['slotEntries', index, 'key'],
        })
        continue
      }

      uniqueKeys.add(entry.key)
    }
  })

function slotEntriesToSlots(slotEntries: Array<{ key: string; value: string }>): Record<string, string> {
  const slots: Record<string, string> = {}

  for (const entry of slotEntries) {
    const canonicalKey = SLOT_KEY_ALIASES[entry.key] ?? entry.key
    if (canonicalKey in slots) {
      continue
    }

    slots[canonicalKey] = entry.value
  }

  return slots
}

export const understandingModelResultSchema = z.object({
  draftTasks: z.array(understandingModelTaskSchema).min(1, 'draftTasks must be non-empty'),
})

export const understandingResultSchema = z.object({
  draftTasks: z.array(understandingTaskSchema).min(1, 'draftTasks must be non-empty'),
})

function normalizeModelDraftTasks(tasks: z.infer<typeof understandingModelTaskSchema>[]) {
  return tasks.map(({ slotEntries, ...task }) => ({
    ...task,
    slots: slotEntriesToSlots(slotEntries),
  }))
}

function prefersModelSchema(value: unknown) {
  if (!value || typeof value !== 'object') {
    return false
  }

  const draftTasks = (value as { draftTasks?: unknown }).draftTasks
  if (!Array.isArray(draftTasks)) {
    return false
  }

  return draftTasks.some(
    (task) => task && typeof task === 'object' && 'slotEntries' in (task as Record<string, unknown>)
  )
}

export type WorkspaceRunModel = (input: {
  systemPrompt: string
  userPrompt: string
  signal?: AbortSignal
}) => Promise<unknown>

export class WorkspaceRunUnderstandingError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'WorkspaceRunUnderstandingError'
  }
}

function dedupeCorrections(corrections: string[]): string[] {
  return Array.from(new Set(corrections))
}

function normalizeTodoTitleFromTimeHints(task: DraftWorkspaceTask, timeHints: string[]) {
  if (task.target !== 'todos' || (task.intent !== 'create' && task.intent !== 'update')) {
    return task
  }

  const trimmedTitle = task.title.trim()
  if (!trimmedTitle) {
    return task
  }

  for (const timeHint of timeHints) {
    const hint = timeHint.trim()
    if (!hint) {
      continue
    }

    const hintIndex = trimmedTitle.indexOf(hint)
    if (hintIndex < 0) {
      continue
    }

    const suffix = trimmedTitle
      .slice(hintIndex + hint.length)
      .replace(leadingPunctuationRegex, '')
      .trim()

    if (!suffix || commandOnlyTitleRegex.test(suffix)) {
      continue
    }

    return {
      ...task,
      title: suffix,
    }
  }

  return task
}

function normalizeCommandOnlyCreateTitle(task: DraftWorkspaceTask) {
  if (task.intent !== 'create' && task.intent !== 'update') {
    return task
  }

  if (!genericCreateCommandOnlyTitleRegex.test(task.title)) {
    return task
  }

  return {
    ...task,
    title: '',
  }
}

function normalizeDraftTaskTitles(tasks: DraftWorkspaceTask[], timeHints: string[]) {
  return tasks.map((task) =>
    normalizeTodoTitleFromTimeHints(normalizeCommandOnlyCreateTitle(task), timeHints)
  )
}

function typoCandidatesToCorrections(
  typoCandidates: NormalizedWorkspaceRunInput['typoCandidates']
): string[] {
  return typoCandidates.map((candidate) => `${candidate.text} -> ${candidate.suggestion}`)
}

function toDraftTasks(tasks: z.infer<typeof understandingTaskSchema>[]): DraftWorkspaceTask[] {
  return tasks.map((task) => ({
    ...task,
  }))
}

export async function understandWorkspaceRunInput(input: {
  normalized: NormalizedWorkspaceRunInput
  runModel: WorkspaceRunModel
  signal?: AbortSignal
}): Promise<WorkspaceUnderstandingPreview> {
  const [systemPrompt, userPrompt] = await Promise.all([
    buildWorkspaceSystemPrompt('workspace-run/system', {}),
    renderPrompt('workspace-run/understand.user', {
      normalizedJson: JSON.stringify(input.normalized),
    }),
  ])

  const modelOutput = await input.runModel({
    systemPrompt,
    userPrompt,
    signal: input.signal,
  })

  if (prefersModelSchema(modelOutput)) {
    const modelParsed = understandingModelResultSchema.safeParse(modelOutput)
    if (!modelParsed.success) {
      const issue = modelParsed.error.issues[0]
      throw new WorkspaceRunUnderstandingError(issue?.message ?? 'Invalid understanding output')
    }

    return {
      rawInput: input.normalized.rawText,
      normalizedInput: input.normalized.normalizedText,
      draftTasks: normalizeDraftTaskTitles(
        toDraftTasks(normalizeModelDraftTasks(modelParsed.data.draftTasks)),
        input.normalized.timeHints
      ),
      corrections: dedupeCorrections(typoCandidatesToCorrections(input.normalized.typoCandidates)),
    }
  }

  const parsed = understandingResultSchema.safeParse(modelOutput)
  if (!parsed.success) {
    const modelParsed = understandingModelResultSchema.safeParse(modelOutput)

    if (!modelParsed.success) {
      const preferredIssue = prefersModelSchema(modelOutput)
        ? modelParsed.error.issues[0]
        : parsed.error.issues[0] ?? modelParsed.error.issues[0]
      throw new WorkspaceRunUnderstandingError(
        preferredIssue?.message ?? 'Invalid understanding output'
      )
    }

    return {
      rawInput: input.normalized.rawText,
      normalizedInput: input.normalized.normalizedText,
      draftTasks: normalizeDraftTaskTitles(
        toDraftTasks(normalizeModelDraftTasks(modelParsed.data.draftTasks)),
        input.normalized.timeHints
      ),
      corrections: dedupeCorrections(typoCandidatesToCorrections(input.normalized.typoCandidates)),
    }
  }

  const validated = understandingResultSchema.safeParse(parsed.data)
  if (!validated.success) {
    const issue = validated.error.issues[0]
    throw new WorkspaceRunUnderstandingError(issue?.message ?? 'Invalid understanding output')
  }

  return {
    rawInput: input.normalized.rawText,
    normalizedInput: input.normalized.normalizedText,
    draftTasks: normalizeDraftTaskTitles(toDraftTasks(validated.data.draftTasks), input.normalized.timeHints),
    corrections: dedupeCorrections(typoCandidatesToCorrections(input.normalized.typoCandidates)),
  }
}
