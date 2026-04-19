import 'server-only'

import { z } from 'zod'

export const parsedCommandIntentSchema = z.enum([
  'create',
  'search',
  'summarize',
])

export const parsedCommandOperationSchema = z.enum([
  'create_note',
  'create_todo',
  'create_link',
  'search_assets',
  'summarize_workspace',
])

export const parsedCommandAssetTypeSchema = z.enum(['todo', 'note', 'link'])

export const parsedCommandCompletionHintSchema = z.enum([
  'complete',
  'incomplete',
])

export const assetSummaryTargetSchema = z.enum([
  'todos',
  'notes',
  'bookmarks',
])

const preservedInputTextSchema = z.string().min(1)

export const todoCommandPayloadSchema = z.object({
  title: z.string().min(1).nullable(),
  content: z.string().min(1).nullable(),
  timeText: z.string().min(1).nullable(),
  dueAtIso: z.string().datetime().nullable(),
  reminder: z.boolean().nullable(),
})

export const noteCommandPayloadSchema = z.object({
  title: z.string().min(1).nullable(),
  content: z.string().min(1).nullable(),
  summary: z.string().min(1).nullable(),
})

export const bookmarkCommandPayloadSchema = z.object({
  url: z.url().nullable(),
  title: z.string().min(1).nullable(),
  note: z.string().min(1).nullable(),
  summary: z.string().min(1).nullable(),
})

export const searchCommandPayloadSchema = z.object({
  query: z.string().min(1).nullable(),
  typeHint: parsedCommandAssetTypeSchema.nullable(),
  timeHint: z.string().min(1).nullable(),
  completionHint: parsedCommandCompletionHintSchema.nullable(),
})

export const summaryCommandPayloadSchema = z.object({
  target: assetSummaryTargetSchema.nullable(),
  query: z.string().min(1).nullable(),
})

const parsedCommandBaseSchema = z.object({
  confidence: z.number().min(0).max(1),
  originalText: preservedInputTextSchema,
  rawInput: preservedInputTextSchema.optional(),
})

const createNoteCommandSchema = z.object({
  intent: z.literal('create'),
  operation: z.literal('create_note'),
  assetType: z.literal('note'),
  todo: z.null(),
  note: noteCommandPayloadSchema,
  bookmark: z.null(),
  search: z.null(),
  summary: z.null(),
})

const createTodoCommandSchema = z.object({
  intent: z.literal('create'),
  operation: z.literal('create_todo'),
  assetType: z.literal('todo'),
  todo: todoCommandPayloadSchema,
  note: z.null(),
  bookmark: z.null(),
  search: z.null(),
  summary: z.null(),
})

const createLinkCommandSchema = z.object({
  intent: z.literal('create'),
  operation: z.literal('create_link'),
  assetType: z.literal('link'),
  todo: z.null(),
  note: z.null(),
  bookmark: bookmarkCommandPayloadSchema,
  search: z.null(),
  summary: z.null(),
})

const searchAssetsCommandSchema = z.object({
  intent: z.literal('search'),
  operation: z.literal('search_assets'),
  assetType: z.null(),
  todo: z.null(),
  note: z.null(),
  bookmark: z.null(),
  search: searchCommandPayloadSchema,
  summary: z.null(),
})

const summarizeWorkspaceCommandSchema = z.object({
  intent: z.literal('summarize'),
  operation: z.literal('summarize_workspace'),
  assetType: z.null(),
  todo: z.null(),
  note: z.null(),
  bookmark: z.null(),
  search: z.null(),
  summary: summaryCommandPayloadSchema,
})

const parsedCommandVariantSchema = z.discriminatedUnion('operation', [
  createNoteCommandSchema,
  createTodoCommandSchema,
  createLinkCommandSchema,
  searchAssetsCommandSchema,
  summarizeWorkspaceCommandSchema,
])

export const parsedCommandSchema = z.intersection(parsedCommandBaseSchema, parsedCommandVariantSchema).superRefine((command, context) => {
  if (command.rawInput && command.rawInput !== command.originalText) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['rawInput'],
      message: 'rawInput must match originalText when provided',
    })
  }
})

export type ParsedCommand = z.infer<typeof parsedCommandSchema>
export type TodoCommandPayload = z.infer<typeof todoCommandPayloadSchema>
export type NoteCommandPayload = z.infer<typeof noteCommandPayloadSchema>
export type BookmarkCommandPayload = z.infer<typeof bookmarkCommandPayloadSchema>
export type SearchCommandPayload = z.infer<typeof searchCommandPayloadSchema>
export type SummaryCommandPayload = z.infer<typeof summaryCommandPayloadSchema>
