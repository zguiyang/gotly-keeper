import 'server-only'

import { z } from 'zod'

import { buildWorkspaceSystemPrompt } from '@/server/lib/ai/ai.prompts'
import { renderPrompt } from '@/server/lib/prompt-template'

import type { NormalizedWorkspaceRunInput } from './workspace-run-normalizer'
import type { WorkspaceRunModel } from './workspace-run-understanding'

const semanticSplitCorrectionSchema = z.object({
  from: z.string().trim().min(1),
  to: z.string().trim().min(1),
  reason: z.string().trim().min(1).optional(),
})

const semanticSplitSegmentSchema = z.object({
  id: z.string().trim().min(1),
  text: z.string().trim().min(1),
  relation: z.enum(['independent', 'continuation', 'modifier']),
  operationCue: z.enum(['new_capture', 'repeat_capture', 'supplement', 'context']).optional(),
  confidence: z.number().min(0).max(1),
})

export const semanticSplitResultSchema = z.object({
  isMultiTask: z.boolean(),
  corrections: z.array(semanticSplitCorrectionSchema),
  segments: z.array(semanticSplitSegmentSchema).min(1, 'segments must be non-empty'),
})

export type SemanticSplitResult = z.infer<typeof semanticSplitResultSchema>

export type WorkspaceSemanticSplitModel = WorkspaceRunModel

export class WorkspaceRunSemanticSplitError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'WorkspaceRunSemanticSplitError'
  }
}

function buildFallbackSplitResult(normalized: NormalizedWorkspaceRunInput): SemanticSplitResult {
  return {
    isMultiTask: false,
    corrections: [],
    segments: [
      {
        id: 'segment_1',
        text: normalized.normalizedText,
        relation: 'independent',
        operationCue: 'new_capture',
        confidence: 0.5,
      },
    ],
  }
}

function shouldUseDeterministicSingleSegment(normalized: NormalizedWorkspaceRunInput) {
  const separatorCount = normalized.separators.length
  const hasLineBreak = /\r?\n/.test(normalized.rawText)

  return !hasLineBreak && separatorCount === 0
}

export async function splitWorkspaceRunInputSemantically(input: {
  normalized: NormalizedWorkspaceRunInput
  runModel: WorkspaceSemanticSplitModel
  preferDeterministic?: boolean
  signal?: AbortSignal
}): Promise<SemanticSplitResult> {
  if (input.preferDeterministic && shouldUseDeterministicSingleSegment(input.normalized)) {
    return buildFallbackSplitResult(input.normalized)
  }

  const [systemPrompt, userPrompt] = await Promise.all([
    buildWorkspaceSystemPrompt('workspace-run/semantic-split.system', {}),
    renderPrompt('workspace-run/semantic-split.user', {
      normalizedJson: JSON.stringify(input.normalized),
    }),
  ])

  const modelOutput = await input.runModel({
    schema: semanticSplitResultSchema,
    systemPrompt,
    userPrompt,
    signal: input.signal,
  })

  const parsed = semanticSplitResultSchema.safeParse(modelOutput)
  if (!parsed.success) {
    if (
      modelOutput &&
      typeof modelOutput === 'object' &&
      Array.isArray((modelOutput as { draftTasks?: unknown }).draftTasks)
    ) {
      return buildFallbackSplitResult(input.normalized)
    }

    const issue = parsed.error.issues[0]
    throw new WorkspaceRunSemanticSplitError(issue?.message ?? 'Invalid semantic split output')
  }

  return parsed.data
}
