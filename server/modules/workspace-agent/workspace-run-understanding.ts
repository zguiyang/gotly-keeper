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
const allowedIntentSchema = z.enum([
  'create',
  'query',
  'summarize',
  'update',
])
const allowedTargetSchema = z.enum(['notes', 'todos', 'bookmarks'])

const understandingTaskSchema = workspaceDraftTaskSchema
  .extend({
    confidence: z.number().min(0).max(1),
    intent: allowedIntentSchema,
    target: allowedTargetSchema,
    title: z.string().transform((title) => title.trim()).pipe(z.string().min(1)),
  })
  .superRefine((task, ctx) => {
    if (commandOnlyTitleRegex.test(task.title)) {
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

export const understandingResultSchema = z.object({
  draftTasks: z.array(understandingTaskSchema).min(1, 'draftTasks must be non-empty'),
})

export type WorkspaceRunModel = (input: {
  systemPrompt: string
  userPrompt: string
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
  })

  const parsed = understandingResultSchema.safeParse(modelOutput)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    throw new WorkspaceRunUnderstandingError(issue?.message ?? 'Invalid understanding output')
  }

  return {
    rawInput: input.normalized.rawText,
    normalizedInput: input.normalized.normalizedText,
    draftTasks: toDraftTasks(parsed.data.draftTasks),
    corrections: dedupeCorrections(typoCandidatesToCorrections(input.normalized.typoCandidates)),
  }
}
