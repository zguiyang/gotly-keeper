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

const allowedIntentSchema = z.enum([
  'create',
  'query',
  'summarize',
  'update',
])
const allowedTargetSchema = z.enum(['notes', 'todos', 'bookmarks', 'mixed'])
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
    cleanTitle: z.string().transform((title) => title.trim()).optional(),
    cleanContent: z.string().transform((content) => content.trim()).optional(),
    captureMode: z.enum(['todo_capture', 'note_capture', 'bookmark_capture', 'none']).optional(),
    clarifyReason: z.enum([
      'unknown_target',
      'missing_content',
      'missing_time_precision',
      'ambiguous_reference',
      'none',
    ]).optional(),
    repeatRelation: z.enum(['independent', 'continuation', 'modifier', 'duplicate_of_previous']).optional(),
    targetConfidence: z.number().min(0).max(1).optional(),
    hasRealContent: z.boolean().default(true),
  })
  .superRefine((task, ctx) => {
    if (task.title.length === 0 && (task.intent === 'query' || task.intent === 'summarize')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'task title cannot be empty for read intents',
        path: ['title'],
      })
    }

    if (!task.hasRealContent && (task.intent === 'query' || task.intent === 'summarize')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'task title must have real content for read intents',
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
    cleanTitle: z.string().transform((title) => title.trim()).optional(),
    cleanContent: z.string().transform((content) => content.trim()).optional(),
    captureMode: z.enum(['todo_capture', 'note_capture', 'bookmark_capture', 'none']).optional(),
    clarifyReason: z.enum([
      'unknown_target',
      'missing_content',
      'missing_time_precision',
      'ambiguous_reference',
      'none',
    ]).optional(),
    repeatRelation: z.enum(['independent', 'continuation', 'modifier', 'duplicate_of_previous']).optional(),
    targetConfidence: z.number().min(0).max(1).optional(),
    hasRealContent: z.boolean().default(true),
    slotEntries: z.array(understandingSlotEntrySchema),
  })
  .superRefine((task, ctx) => {
    if (task.title.length === 0 && (task.intent === 'query' || task.intent === 'summarize')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'task title cannot be empty for read intents',
        path: ['title'],
      })
    }

    if (!task.hasRealContent && (task.intent === 'query' || task.intent === 'summarize')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'task title must have real content for read intents',
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
  schema: z.ZodType<unknown>
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

function normalizeCommandOnlyCreateTitle(task: DraftWorkspaceTask) {
  if (task.intent !== 'create' && task.intent !== 'update') {
    return task
  }

  if (task.hasRealContent) {
    return task
  }

  return {
    ...task,
    title: '',
    cleanTitle: '',
  }
}

function normalizeTodoCreateTitle(task: DraftWorkspaceTask) {
  if (task.intent !== 'create' || task.target !== 'todos' || !task.hasRealContent) {
    return task
  }

  const timeHint =
    task.slots.timeText ??
    task.slots.time ??
    task.slots.due ??
    task.slots.dueDate ??
    task.slots.dueText ??
    task.slots.dueTime

  if (!timeHint || !task.title.includes(timeHint)) {
    return task
  }

  const [, remainder] = task.title.split(timeHint, 2)
  const normalizedTitle = remainder?.replace(/^[，,、:：;；\s]+/, '').trim() ?? ''

  if (normalizedTitle.length === 0) {
    return task
  }

  return {
    ...task,
    title: normalizedTitle,
    cleanTitle: normalizedTitle,
  }
}

function normalizeStructuredFields(task: DraftWorkspaceTask): DraftWorkspaceTask {
  const title = task.title.trim()
  const cleanTitle = task.cleanTitle?.trim()
  const cleanContent = task.cleanContent?.trim()

  return {
    ...task,
    title,
    ...(cleanTitle && cleanTitle.length > 0 ? { cleanTitle } : {}),
    ...(cleanContent && cleanContent.length > 0 ? { cleanContent } : {}),
    ...(task.clarifyReason ? { clarifyReason: task.clarifyReason } : {}),
    ...(task.repeatRelation ? { repeatRelation: task.repeatRelation } : {}),
    ...(task.captureMode ? { captureMode: task.captureMode } : {}),
    ...(typeof task.targetConfidence === 'number' ? { targetConfidence: task.targetConfidence } : {}),
  }
}

function inferReadTargetFromText(text: string): DraftWorkspaceTask['target'] {
  if (text.includes('书签') || text.includes('链接')) {
    return 'bookmarks'
  }

  if (text.includes('待办')) {
    return 'todos'
  }

  if (text.includes('笔记')) {
    return 'notes'
  }

  return 'mixed'
}

function applyMvpTaskContract(task: DraftWorkspaceTask, rawInput: string): DraftWorkspaceTask {
  const normalizedInput = rawInput.replace(/\s+/g, '')
  const notePrefix = /^(帮我)?记一下[:：]?$/.test(normalizedInput.slice(0, 6)) || normalizedInput.startsWith('记一下')
  const todoPrefix = normalizedInput.startsWith('记个待办') || normalizedInput.startsWith('帮我记个待办')
  const queryPrefix = /^(帮我)?(找一下|找找|找回|搜一下|搜索|查一下|查找|看看)/.test(normalizedInput)
  const todoUpdateSignal =
    normalizedInput.includes('待办') &&
    /(标记完成|标记为完成|改成完成|改成已完成|更新)/.test(normalizedInput)
  const bookmarkSignal = /^https?:\/\//i.test(task.title.trim()) || typeof task.slots.url === 'string'

  if (queryPrefix) {
    return {
      ...task,
      intent: 'query' as const,
      target: inferReadTargetFromText(normalizedInput),
      captureMode: 'none' as const,
      clarifyReason: 'none' as const,
      ambiguities: [],
      confidence: Math.max(task.confidence, 0.85),
    }
  }

  if (todoUpdateSignal) {
    return {
      ...task,
      intent: 'update' as const,
      target: 'todos' as const,
      captureMode: 'none' as const,
      clarifyReason: task.clarifyReason ?? 'none',
      confidence: Math.max(task.confidence, 0.85),
    }
  }

  if (todoPrefix) {
    return {
      ...task,
      intent: 'create' as const,
      target: 'todos' as const,
      captureMode: 'todo_capture' as const,
      clarifyReason:
        task.clarifyReason === 'missing_time_precision' ? task.clarifyReason : 'none',
      ambiguities:
        task.clarifyReason === 'missing_time_precision' ? task.ambiguities : [],
      confidence: Math.max(task.confidence, 0.85),
    }
  }

  if (notePrefix && !bookmarkSignal) {
    return {
      ...task,
      intent: 'create' as const,
      target: 'notes' as const,
      captureMode: 'note_capture' as const,
      clarifyReason: 'none' as const,
      ambiguities: [],
      confidence: Math.max(task.confidence, 0.85),
    }
  }

  if (bookmarkSignal && task.intent === 'create') {
    return {
      ...task,
      target: 'bookmarks' as const,
      captureMode: 'bookmark_capture' as const,
      confidence: Math.max(task.confidence, 0.85),
    }
  }

  return task
}

function normalizeDraftTasks(tasks: DraftWorkspaceTask[], rawInput: string) {
  return tasks.map((task) =>
    normalizeStructuredFields(
      applyMvpTaskContract(
        normalizeTodoCreateTitle(normalizeCommandOnlyCreateTitle(task)),
        rawInput
      )
    )
  )
}

function toDraftTasks(tasks: z.infer<typeof understandingTaskSchema>[]): DraftWorkspaceTask[] {
  return tasks.map((task) => ({
    ...task,
  }))
}

export async function understandWorkspaceRunInput(input: {
  normalized: NormalizedWorkspaceRunInput
  runModel: WorkspaceRunModel
  inheritedCorrections?: string[]
  signal?: AbortSignal
}): Promise<WorkspaceUnderstandingPreview> {
  const [systemPrompt, userPrompt] = await Promise.all([
    buildWorkspaceSystemPrompt('workspace-run/system', {}),
    renderPrompt('workspace-run/understand.user', {
      normalizedJson: JSON.stringify(input.normalized),
      inheritedCorrectionsJson: JSON.stringify(input.inheritedCorrections ?? []),
    }),
  ])

  const modelOutput = await input.runModel({
    schema: understandingModelResultSchema,
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
      draftTasks: normalizeDraftTasks(
        toDraftTasks(normalizeModelDraftTasks(modelParsed.data.draftTasks)),
        input.normalized.normalizedText,
      ),
      corrections: input.inheritedCorrections ?? [],
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
      draftTasks: normalizeDraftTasks(
        toDraftTasks(normalizeModelDraftTasks(modelParsed.data.draftTasks)),
        input.normalized.normalizedText,
      ),
      corrections: input.inheritedCorrections ?? [],
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
    draftTasks: normalizeDraftTasks(
      toDraftTasks(validated.data.draftTasks),
      input.normalized.normalizedText
    ),
    corrections: input.inheritedCorrections ?? [],
  }
}
