import 'server-only'

import path from 'node:path'
import { promises as fs } from 'node:fs'

import { z } from 'zod'

import { createWorkspaceRunRuntime } from './workspace-run-runtime'
import {
  normalizeWorkspaceRunInputWithModel,
} from './workspace-run-normalizer'
import { understandWorkspaceRunInput } from './workspace-run-understanding'

import type { WorkspaceUnderstandingPreview } from '@/shared/workspace/workspace-run-protocol'

export const workspaceIntentEvalActionClassSchema = z.enum([
  'note',
  'todo',
  'bookmark',
  'clarify',
  'other',
])

export const workspaceIntentEvalBucketSchema = z.enum([
  'explicit_command',
  'natural_capture',
  'time_phrase_conflict',
  'typo_noise',
  'bookmark_with_context',
  'should_clarify',
])

export const workspaceIntentEvalExpectationSchema = z.object({
  intent: z.literal('create'),
  target: z.enum(['notes', 'todos', 'bookmarks', 'mixed']),
  actionClass: workspaceIntentEvalActionClassSchema.exclude(['other']),
})

export const workspaceIntentEvalExpectedTaskSchema = z.object({
  target: z.enum(['notes', 'todos', 'bookmarks', 'mixed']),
  actionClass: workspaceIntentEvalActionClassSchema.exclude(['other']),
  titleIncludes: z.string().trim().min(1).optional(),
  cleanTitleIncludes: z.string().trim().min(1).optional(),
  cleanContentIncludes: z.string().trim().min(1).optional(),
  cleanContentExcludes: z.array(z.string().trim().min(1)).optional(),
})

export const workspaceIntentEvalCaseSchema = z.object({
  id: z.string().trim().min(1),
  bucket: workspaceIntentEvalBucketSchema,
  input: z.string().trim().min(1),
  expected: workspaceIntentEvalExpectationSchema,
  expectedTasks: z.array(workspaceIntentEvalExpectedTaskSchema).min(1).optional(),
})

export const workspaceIntentEvalDatasetSchema = z.object({
  version: z.number().int().positive(),
  description: z.string().trim().min(1),
  cases: z.array(workspaceIntentEvalCaseSchema).min(1),
})

export type WorkspaceIntentEvalActionClass = z.infer<
  typeof workspaceIntentEvalActionClassSchema
>
export type WorkspaceIntentEvalBucket = z.infer<
  typeof workspaceIntentEvalBucketSchema
>
export type WorkspaceIntentEvalExpectation = z.infer<
  typeof workspaceIntentEvalExpectationSchema
>
export type WorkspaceIntentEvalCase = z.infer<
  typeof workspaceIntentEvalCaseSchema
>
export type WorkspaceIntentEvalDataset = z.infer<
  typeof workspaceIntentEvalDatasetSchema
>

export type WorkspaceIntentEvalPrediction = {
  actionClass: WorkspaceIntentEvalActionClass
  intent: 'create' | 'query' | 'summarize' | 'update' | 'unknown'
  target: 'notes' | 'todos' | 'bookmarks' | 'mixed' | 'unknown'
  confidence: number | null
  reason:
    | 'resolved_target'
    | 'ambiguous_draft_task'
    | 'low_confidence'
    | 'missing_real_content'
    | 'non_create_intent'
    | 'missing_draft_task'
    | 'multiple_draft_tasks'
    | 'execution_error'
  taskCount: number
}

export type WorkspaceIntentEvalExpectedTask = z.infer<
  typeof workspaceIntentEvalExpectedTaskSchema
>

export type WorkspaceIntentEvalCaseResult = {
  caseId: string
  bucket: WorkspaceIntentEvalBucket
  input: string
  expected: WorkspaceIntentEvalExpectation
  actual: WorkspaceIntentEvalPrediction
  matched: boolean
  normalizedInput?: string
  understanding?: WorkspaceUnderstandingPreview
  error?: string
}

export type WorkspaceIntentEvalSummary = {
  overall: {
    total: number
    matched: number
    accuracy: number
  }
  byBucket: Record<
    WorkspaceIntentEvalBucket,
    {
      total: number
      matched: number
      accuracy: number
    }
  >
  confusionMatrix: Record<
    Exclude<WorkspaceIntentEvalActionClass, 'other'>,
    Record<WorkspaceIntentEvalActionClass, number>
  >
  mismatches: WorkspaceIntentEvalCaseResult[]
}

const EXPECTED_ACTION_CLASSES: Exclude<WorkspaceIntentEvalActionClass, 'other'>[] = [
  'note',
  'todo',
  'bookmark',
  'clarify',
]

const ALL_ACTION_CLASSES: WorkspaceIntentEvalActionClass[] = [
  'note',
  'todo',
  'bookmark',
  'clarify',
  'other',
]

export const DEFAULT_WORKSPACE_INTENT_EVAL_DATASET_PATH = path.resolve(
  process.cwd(),
  'tests/fixtures/workspace/workspace-intent-eval.json'
)

function createEmptyBucketSummary() {
  return {
    total: 0,
    matched: 0,
    accuracy: 0,
  }
}

function createEmptyConfusionRow(): Record<WorkspaceIntentEvalActionClass, number> {
  return {
    note: 0,
    todo: 0,
    bookmark: 0,
    clarify: 0,
    other: 0,
  }
}

function deriveDraftTaskActionClass(
  task: WorkspaceUnderstandingPreview['draftTasks'][number]
): WorkspaceIntentEvalActionClass {
  if (task.intent !== 'create') {
    return 'other'
  }

  if (task.hasRealContent === false) {
    return 'clarify'
  }

  if (task.ambiguities.length > 0 || task.target === 'mixed') {
    return 'clarify'
  }

  if (typeof task.confidence === 'number' && task.confidence < 0.7) {
    return 'clarify'
  }

  if (task.target === 'notes') {
    return 'note'
  }

  if (task.target === 'todos') {
    return 'todo'
  }

  if (task.target === 'bookmarks') {
    return 'bookmark'
  }

  return 'other'
}

export async function loadWorkspaceIntentEvalDataset(
  filePath = DEFAULT_WORKSPACE_INTENT_EVAL_DATASET_PATH
): Promise<WorkspaceIntentEvalDataset> {
  const raw = await fs.readFile(filePath, 'utf8')
  const parsed = JSON.parse(raw) as unknown
  return workspaceIntentEvalDatasetSchema.parse(parsed)
}

export function deriveWorkspaceIntentEvalPrediction(
  understanding: WorkspaceUnderstandingPreview
): WorkspaceIntentEvalPrediction {
  const taskCount = understanding.draftTasks.length

  if (taskCount === 0) {
    return {
      actionClass: 'clarify',
      intent: 'unknown',
      target: 'unknown',
      confidence: null,
      reason: 'missing_draft_task',
      taskCount,
    }
  }

  if (taskCount > 1) {
    const createTargets = understanding.draftTasks.every((task) => task.intent === 'create')
    return {
      actionClass: 'clarify',
      intent: createTargets ? 'create' : 'unknown',
      target: 'mixed',
      confidence: null,
      reason: 'multiple_draft_tasks',
      taskCount,
    }
  }

  const task = understanding.draftTasks[0]

  if (!task) {
    return {
      actionClass: 'clarify',
      intent: 'unknown',
      target: 'unknown',
      confidence: null,
      reason: 'missing_draft_task',
      taskCount,
    }
  }

  const base = {
    intent: task.intent as WorkspaceIntentEvalPrediction['intent'],
    target: task.target as WorkspaceIntentEvalPrediction['target'],
    confidence: typeof task.confidence === 'number' ? task.confidence : null,
    taskCount,
  }

  const actionClass = deriveDraftTaskActionClass(task)

  if (actionClass === 'other') {
    return {
      actionClass,
      reason: 'non_create_intent',
      ...base,
    }
  }

  if (actionClass === 'clarify') {
    return {
      actionClass,
      reason:
        task.hasRealContent === false
          ? 'missing_real_content'
          : task.ambiguities.length > 0 || task.target === 'mixed'
            ? 'ambiguous_draft_task'
            : 'low_confidence',
      ...base,
    }
  }

  return {
    actionClass,
    reason: 'resolved_target',
    ...base,
  }
}

function matchesExpectedTask(
  actualTask: WorkspaceUnderstandingPreview['draftTasks'][number] | undefined,
  expectedTask: WorkspaceIntentEvalExpectedTask
) {
  if (!actualTask) {
    return false
  }

  if (deriveDraftTaskActionClass(actualTask) !== expectedTask.actionClass) {
    return false
  }

  if (actualTask.target !== expectedTask.target) {
    return false
  }

  if (expectedTask.titleIncludes && !actualTask.title.includes(expectedTask.titleIncludes)) {
    return false
  }

  if (
    expectedTask.cleanTitleIncludes &&
    !(actualTask.cleanTitle ?? '').includes(expectedTask.cleanTitleIncludes)
  ) {
    return false
  }

  if (
    expectedTask.cleanContentIncludes &&
    !(actualTask.cleanContent ?? '').includes(expectedTask.cleanContentIncludes)
  ) {
    return false
  }

  if (
    expectedTask.cleanContentExcludes?.some((fragment) =>
      (actualTask.cleanContent ?? '').includes(fragment)
    )
  ) {
    return false
  }

  return true
}

export function matchWorkspaceIntentEvalCase(
  understanding: WorkspaceUnderstandingPreview,
  testCase: WorkspaceIntentEvalCase,
  actual: WorkspaceIntentEvalPrediction
) {
  const baseMatched =
    actual.actionClass === testCase.expected.actionClass &&
    actual.intent === testCase.expected.intent &&
    actual.target === testCase.expected.target

  if (!testCase.expectedTasks) {
    return baseMatched
  }

  if (understanding.draftTasks.length !== testCase.expectedTasks.length) {
    return false
  }

  return testCase.expectedTasks.every((expectedTask, index) =>
    matchesExpectedTask(understanding.draftTasks[index], expectedTask)
  )
}

export async function runWorkspaceIntentEvalCase(input: {
  testCase: WorkspaceIntentEvalCase
  signal?: AbortSignal
}): Promise<WorkspaceIntentEvalCaseResult> {
  const { runModel } = createWorkspaceRunRuntime()

  try {
    const normalized = await normalizeWorkspaceRunInputWithModel({
      rawText: input.testCase.input,
      runModel,
      signal: input.signal,
    })

    const understanding = await understandWorkspaceRunInput({
      normalized,
      runModel,
      signal: input.signal,
    })

    const actual = deriveWorkspaceIntentEvalPrediction(understanding)
    const matched = matchWorkspaceIntentEvalCase(understanding, input.testCase, actual)

    return {
      caseId: input.testCase.id,
      bucket: input.testCase.bucket,
      input: input.testCase.input,
      expected: input.testCase.expected,
      actual,
      matched,
      normalizedInput: normalized.normalizedText,
      understanding,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return {
      caseId: input.testCase.id,
      bucket: input.testCase.bucket,
      input: input.testCase.input,
      expected: input.testCase.expected,
      actual: {
        actionClass: 'other',
        intent: 'unknown',
        target: 'unknown',
        confidence: null,
        reason: 'execution_error',
        taskCount: 0,
      },
      matched: false,
      error: message,
    }
  }
}

export async function runWorkspaceIntentEvalDataset(input: {
  dataset: WorkspaceIntentEvalDataset
  signal?: AbortSignal
}): Promise<WorkspaceIntentEvalCaseResult[]> {
  const results: WorkspaceIntentEvalCaseResult[] = []

  for (const testCase of input.dataset.cases) {
    if (input.signal?.aborted) {
      break
    }

    results.push(
      await runWorkspaceIntentEvalCase({
        testCase,
        signal: input.signal,
      })
    )
  }

  return results
}

export function summarizeWorkspaceIntentEvalRun(
  results: WorkspaceIntentEvalCaseResult[]
): WorkspaceIntentEvalSummary {
  const byBucket = Object.fromEntries(
    workspaceIntentEvalBucketSchema.options.map((bucket) => [bucket, createEmptyBucketSummary()])
  ) as WorkspaceIntentEvalSummary['byBucket']

  const confusionMatrix = Object.fromEntries(
    EXPECTED_ACTION_CLASSES.map((actionClass) => [actionClass, createEmptyConfusionRow()])
  ) as WorkspaceIntentEvalSummary['confusionMatrix']

  let matched = 0

  for (const result of results) {
    const bucketSummary = byBucket[result.bucket]
    bucketSummary.total += 1

    if (result.matched) {
      bucketSummary.matched += 1
      matched += 1
    }

    const row = confusionMatrix[result.expected.actionClass]
    row[result.actual.actionClass] += 1
  }

  for (const bucket of workspaceIntentEvalBucketSchema.options) {
    const bucketSummary = byBucket[bucket]
    bucketSummary.accuracy =
      bucketSummary.total === 0 ? 0 : bucketSummary.matched / bucketSummary.total
  }

  return {
    overall: {
      total: results.length,
      matched,
      accuracy: results.length === 0 ? 0 : matched / results.length,
    },
    byBucket,
    confusionMatrix,
    mismatches: results.filter((result) => !result.matched),
  }
}

export function formatWorkspaceIntentEvalSummary(summary: WorkspaceIntentEvalSummary) {
  const bucketLines = workspaceIntentEvalBucketSchema.options
    .filter((bucket) => summary.byBucket[bucket].total > 0)
    .map((bucket) => {
      const stats = summary.byBucket[bucket]
      return `- ${bucket}: ${stats.matched}/${stats.total} (${(stats.accuracy * 100).toFixed(1)}%)`
    })

  const confusionLines = EXPECTED_ACTION_CLASSES.map((expected) => {
    const cells = ALL_ACTION_CLASSES.map((actual) => `${actual}=${summary.confusionMatrix[expected][actual]}`)
    return `- expected=${expected}: ${cells.join(', ')}`
  })

  return [
    `Overall: ${summary.overall.matched}/${summary.overall.total} (${(summary.overall.accuracy * 100).toFixed(1)}%)`,
    'By bucket:',
    ...bucketLines,
    'Confusion matrix:',
    ...confusionLines,
  ].join('\n')
}
