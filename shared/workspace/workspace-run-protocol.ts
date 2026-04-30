import { z } from 'zod'

import type { AssetListItem } from '@/shared/assets/assets.types'

export const workspaceRunPhaseSchema = z.enum([
  'normalize',
  'understand',
  'plan',
  'review',
  'preview',
  'execute',
  'compose',
])

export type WorkspaceRunPhase = z.infer<typeof workspaceRunPhaseSchema>

const workspaceDraftTaskSchema = z.object({
  id: z.string(),
  intent: z.string(),
  target: z.enum(['todos', 'notes', 'bookmarks', 'mixed']),
  title: z.string(),
  confidence: z.number(),
  ambiguities: z.array(z.string()),
  corrections: z.array(z.string()),
  slots: z.record(z.string(), z.string()),
})

export type DraftWorkspaceTask = z.infer<typeof workspaceDraftTaskSchema>

const workspacePlanStepSchema = z.object({
  id: z.string(),
  toolName: z.string(),
  title: z.string(),
  preview: z.string(),
})

export type WorkspacePlanStep = z.infer<typeof workspacePlanStepSchema>

const workspacePlanPreviewSchema = z.object({
  summary: z.string(),
  steps: z.array(workspacePlanStepSchema),
})

export type WorkspacePlanPreview = z.infer<typeof workspacePlanPreviewSchema>

const workspaceUnderstandingPreviewSchema = z.object({
  rawInput: z.string(),
  normalizedInput: z.string(),
  draftTasks: z.array(workspaceDraftTaskSchema),
  corrections: z.array(z.string()),
})

export type WorkspaceUnderstandingPreview = z.infer<
  typeof workspaceUnderstandingPreviewSchema
>

const workspacePreviewSchema = z.object({
  understanding: workspaceUnderstandingPreviewSchema.optional(),
  plan: workspacePlanPreviewSchema.optional(),
})

export type WorkspaceRunPreview = z.infer<typeof workspacePreviewSchema>

const workspaceCandidateSchema = z.object({
  id: z.string(),
  label: z.string(),
  reason: z.string().optional(),
})

export type WorkspaceCandidate = z.infer<typeof workspaceCandidateSchema>

const workspaceClarificationFieldSchema = z.object({
  key: z.string(),
  label: z.string(),
  required: z.boolean().default(true),
  placeholder: z.string().optional(),
})

export type WorkspaceClarificationField = z.infer<
  typeof workspaceClarificationFieldSchema
>

const workspaceInteractionSchema = z.discriminatedUnion('type', [
  z.object({
    runId: z.string(),
    id: z.string(),
    type: z.literal('confirm_plan'),
    message: z.string(),
    actions: z.tuple([
      z.literal('confirm'),
      z.literal('edit'),
      z.literal('cancel'),
    ]),
    plan: workspacePlanPreviewSchema,
  }),
  z.object({
    runId: z.string(),
    id: z.string(),
    type: z.literal('select_candidate'),
    target: z.enum(['todo', 'note', 'bookmark']),
    message: z.string(),
    actions: z.tuple([
      z.literal('select'),
      z.literal('skip'),
      z.literal('cancel'),
    ]),
    candidates: z.array(workspaceCandidateSchema),
  }),
  z.object({
    runId: z.string(),
    id: z.string(),
    type: z.literal('clarify_slots'),
    message: z.string(),
    actions: z.tuple([z.literal('submit'), z.literal('cancel')]),
    fields: z.array(workspaceClarificationFieldSchema),
  }),
  z.object({
    runId: z.string(),
    id: z.string(),
    type: z.literal('edit_draft_tasks'),
    message: z.string(),
    actions: z.tuple([z.literal('save'), z.literal('cancel')]),
    tasks: z.array(workspaceDraftTaskSchema),
  }),
])

export type WorkspaceInteraction = z.infer<typeof workspaceInteractionSchema>

export type ConfirmPlanInteraction = Extract<
  WorkspaceInteraction,
  { type: 'confirm_plan' }
>

export type SelectCandidateInteraction = Extract<
  WorkspaceInteraction,
  { type: 'select_candidate' }
>

export type ClarifySlotsInteraction = Extract<
  WorkspaceInteraction,
  { type: 'clarify_slots' }
>

export type EditDraftTasksInteraction = Extract<
  WorkspaceInteraction,
  { type: 'edit_draft_tasks' }
>

export const workspaceInteractionResponseSchema = z.discriminatedUnion('type', [
  z.discriminatedUnion('action', [
    z.object({
      type: z.literal('confirm_plan'),
      action: z.literal('confirm'),
    }),
    z.object({
      type: z.literal('confirm_plan'),
      action: z.literal('edit'),
      editedPlan: workspacePlanPreviewSchema,
    }),
    z.object({
      type: z.literal('confirm_plan'),
      action: z.literal('cancel'),
    }),
  ]),
  z.discriminatedUnion('action', [
    z.object({
      type: z.literal('select_candidate'),
      action: z.literal('select'),
      candidateId: z.string(),
    }),
    z.object({
      type: z.literal('select_candidate'),
      action: z.literal('skip'),
    }),
    z.object({
      type: z.literal('select_candidate'),
      action: z.literal('cancel'),
    }),
  ]),
  z.discriminatedUnion('action', [
    z.object({
      type: z.literal('clarify_slots'),
      action: z.literal('submit'),
      values: z.record(z.string(), z.string()),
    }),
    z.object({
      type: z.literal('clarify_slots'),
      action: z.literal('cancel'),
    }),
  ]),
  z.discriminatedUnion('action', [
    z.object({
      type: z.literal('edit_draft_tasks'),
      action: z.literal('save'),
      tasks: z.array(workspaceDraftTaskSchema),
    }),
    z.object({
      type: z.literal('edit_draft_tasks'),
      action: z.literal('cancel'),
    }),
  ]),
])

export type WorkspaceInteractionResponse = z.infer<
  typeof workspaceInteractionResponseSchema
>

export const workspaceRunRequestSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('input'),
    text: z.string(),
  }),
  z.object({
    kind: z.literal('quick-action'),
    action: z.enum([
      'review-todos',
      'summarize-notes',
      'summarize-bookmarks',
    ]),
  }),
  z.object({
    kind: z.literal('resume'),
    runId: z.string(),
    interactionId: z.string(),
    response: workspaceInteractionResponseSchema,
  }),
])

export type WorkspaceRunRequest = z.infer<typeof workspaceRunRequestSchema>

export type WorkspaceRunToolResult =
  | {
      ok: true
      target: 'notes' | 'todos' | 'bookmarks' | 'mixed'
      items?: AssetListItem[]
      total?: number
      action?: 'create' | 'update'
      item?: AssetListItem | null
    }
  | {
      ok: false
      code?: string
      message: string
    }

export type WorkspaceRunStepResult = {
  stepId: string
  toolName: string
  result: WorkspaceRunToolResult
}

const workspaceRunToolResultSchema = z.custom<WorkspaceRunToolResult>((value) => {
  return typeof value === 'object' && value !== null && 'ok' in value
})

const workspaceRunStepResultSchema = z.object({
  stepId: z.string(),
  toolName: z.string(),
  result: workspaceRunToolResultSchema,
}) satisfies z.ZodType<WorkspaceRunStepResult>

const workspaceRunResultSchema = z.object({
  summary: z.string(),
  answer: z.string().optional(),
  preview: workspacePreviewSchema.nullable().optional(),
  data: workspaceRunToolResultSchema.nullable().optional(),
  stepResults: z.array(workspaceRunStepResultSchema).optional(),
}) satisfies z.ZodType<{
  summary: string
  answer?: string
  preview?: WorkspaceRunPreview | null
  data?: WorkspaceRunToolResult | null
  stepResults?: WorkspaceRunStepResult[]
}>

export type WorkspaceRunResult = z.infer<typeof workspaceRunResultSchema>

const workspaceRunErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  retryable: z.boolean().optional(),
})

export type WorkspaceRunError = z.infer<typeof workspaceRunErrorSchema>

export const workspaceRunStreamEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('phase_started'),
    phase: workspaceRunPhaseSchema,
  }),
  z.object({
    type: z.literal('phase_completed'),
    phase: workspaceRunPhaseSchema,
    output: z.unknown().optional(),
  }),
  z.object({
    type: z.literal('awaiting_user'),
    interaction: workspaceInteractionSchema,
  }),
  z.object({
    type: z.literal('tool_call_started'),
    toolName: z.string(),
    preview: z.string(),
  }),
  z.object({
    type: z.literal('tool_call_completed'),
    toolName: z.string(),
    result: workspaceRunToolResultSchema,
  }),
  z.object({
    type: z.literal('run_completed'),
    result: workspaceRunResultSchema,
  }),
  z.object({
    type: z.literal('run_failed'),
    error: workspaceRunErrorSchema,
  }),
])

export type WorkspaceRunStreamEvent = z.infer<
  typeof workspaceRunStreamEventSchema
>

const workspacePendingRunSnapshotSchema = z
  .object({
    runId: z.string(),
    referenceTime: z.string().optional(),
    phase: workspaceRunPhaseSchema,
    status: z.literal('awaiting_user'),
    interactionId: z.string(),
    interaction: workspaceInteractionSchema,
    preview: workspacePreviewSchema.nullable(),
    timeline: z.array(workspaceRunStreamEventSchema),
    understandingPreview: workspaceUnderstandingPreviewSchema.nullable(),
    planPreview: workspacePlanPreviewSchema.nullable(),
    correctionNotes: z.array(z.string()),
    updatedAt: z.string(),
  })
  .superRefine((snapshot, ctx) => {
    if (snapshot.interaction.runId !== snapshot.runId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'interaction.runId must match snapshot.runId',
        path: ['interaction', 'runId'],
      })
    }

    if (snapshot.interaction.id !== snapshot.interactionId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'interaction.id must match snapshot.interactionId',
        path: ['interaction', 'id'],
      })
    }
  })

export type WorkspacePendingRunSnapshot = z.infer<
  typeof workspacePendingRunSnapshotSchema
>

export {
  workspaceCandidateSchema,
  workspaceClarificationFieldSchema,
  workspaceDraftTaskSchema,
  workspaceInteractionSchema,
  workspacePendingRunSnapshotSchema,
  workspacePlanPreviewSchema,
  workspacePlanStepSchema,
  workspacePreviewSchema,
  workspaceRunErrorSchema,
  workspaceRunResultSchema,
  workspaceUnderstandingPreviewSchema,
}
