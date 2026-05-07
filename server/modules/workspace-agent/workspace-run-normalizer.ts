import 'server-only'

import { z } from 'zod'

import { buildWorkspaceSystemPrompt } from '@/server/lib/ai/ai.prompts'
import { renderPrompt } from '@/server/lib/prompt-template'

import type { WorkspaceRunModel } from './workspace-run-understanding'

const URL_REGEX = /https?:\/\/[^\s，,；;。]+/g
const SEPARATOR_REGEX = /[，,；;。]/g

const typoCandidateSchema = z.object({
  text: z.string().trim().min(1),
  suggestion: z.string().trim().min(1),
})

export const workspaceRunNormalizationModelResultSchema = z.object({
  rawText: z.string(),
  normalizedText: z.string().trim().min(1),
  urls: z.array(z.string()),
  separators: z.array(z.string()),
  typoCandidates: z.array(typoCandidateSchema),
  timeHints: z.array(z.string().trim().min(1)),
})

export type NormalizedWorkspaceRunInput = {
  rawText: string
  normalizedText: string
  urls: string[]
  separators: string[]
  typoCandidates: Array<z.infer<typeof typoCandidateSchema>>
  timeHints: string[]
}

type UrlMatch = {
  start: number
  end: number
  text: string
}

function extractUrls(text: string): UrlMatch[] {
  return Array.from(text.matchAll(URL_REGEX), (match) => ({
    start: match.index ?? 0,
    end: (match.index ?? 0) + match[0].length,
    text: match[0],
  }))
}

export function normalizeWorkspaceRunInput(rawText: string): NormalizedWorkspaceRunInput {
  const urlMatches = extractUrls(rawText)
  let normalizedText = ''
  let cursor = 0

  for (const match of urlMatches) {
    normalizedText += rawText.slice(cursor, match.start)
    normalizedText += match.text
    cursor = match.end
  }

  normalizedText += rawText.slice(cursor)

  return {
    rawText,
    normalizedText: normalizedText.trim(),
    urls: urlMatches.map((match) => match.text),
    separators: Array.from(rawText.matchAll(SEPARATOR_REGEX), (match) => match[0]),
    typoCandidates: [],
    timeHints: [],
  }
}

export class WorkspaceRunNormalizationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'WorkspaceRunNormalizationError'
  }
}

export async function normalizeWorkspaceRunInputWithModel(input: {
  rawText: string
  runModel: WorkspaceRunModel
  signal?: AbortSignal
}): Promise<NormalizedWorkspaceRunInput> {
  const deterministicSignals = normalizeWorkspaceRunInput(input.rawText)

  const [systemPrompt, userPrompt] = await Promise.all([
    buildWorkspaceSystemPrompt('workspace-run/normalize.system', {}),
    renderPrompt('workspace-run/normalize.user', {
      rawText: input.rawText,
    }),
  ])

  const modelOutput = await input.runModel({
    schema: workspaceRunNormalizationModelResultSchema,
    systemPrompt,
    userPrompt,
    signal: input.signal,
  })

  const parsed = workspaceRunNormalizationModelResultSchema.safeParse(modelOutput)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    throw new WorkspaceRunNormalizationError(issue?.message ?? 'Invalid normalization output')
  }

  return {
    rawText: input.rawText,
    normalizedText: parsed.data.normalizedText.trim(),
    urls: deterministicSignals.urls,
    separators: deterministicSignals.separators,
    typoCandidates: parsed.data.typoCandidates,
    timeHints: parsed.data.timeHints,
  }
}
