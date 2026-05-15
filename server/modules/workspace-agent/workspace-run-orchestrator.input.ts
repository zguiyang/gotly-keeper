import { z } from 'zod'

import { buildWorkspaceSystemPrompt } from '@/server/lib/ai/ai.prompts'

import { buildFallbackAnswer, composeWorkspaceAnswer } from './workspace-compose'
import { buildBatchAnswer, buildCompletedRunResult } from './workspace-run-completed'
import {
  findWorkspaceCreateDuplicateCandidate,
  findWorkspaceCreateDuplicateCandidates,
} from './workspace-run-duplicates'
import { executeWorkspaceRunSteps } from './workspace-run-executor'
import {
  normalizeWorkspaceRunInput,
} from './workspace-run-normalizer'
import {
  createRunId,
  emitEvent,
  getToolNameFromAction,
  getToolResultError,
  recordPhaseTiming,
} from './workspace-run-orchestrator.shared'
import { planWorkspaceRun } from './workspace-run-planner'
import { buildWorkspaceRunPreview } from './workspace-run-preview'
import { reviewWorkspaceRunPlan } from './workspace-run-review'
import { isWorkspaceRunModelError } from './workspace-run-runtime'
import { splitWorkspaceRunInputSemantically } from './workspace-run-semantic-split'
import { normalizeTodoDraftTaskTimes } from './workspace-run-time-normalization'
import { understandWorkspaceRunInput } from './workspace-run-understanding'

import type { WorkspaceToolContext, WorkspaceToolResult, WorkspaceIntent, WorkspaceTarget } from './types'
import type {
  OrchestrateWorkspaceRunOptions,
  WorkspaceRunOrchestratorResult,
} from './workspace-run-orchestrator'
import type { PhaseContext } from './workspace-run-orchestrator.shared'
import type {
  WorkspaceRunPlanHint,
  WorkspaceRunPlannerResult,
  WorkspaceRunPlannerStep,
} from './workspace-run-planner'
import type { DraftWorkspaceTask, WorkspaceInteraction } from '@/shared/workspace/workspace-run-protocol'

const WS_LOG_PREFIX = '[workspace]'
const workspaceRunPlanHintSchema = z.object({
  action: z.enum([
    'create_note',
    'create_todo',
    'create_bookmark',
    'query_assets',
    'summarize_assets',
    'update_todo',
  ]),
  title: z.string().optional(),
  query: z.string().optional(),
  reason: z.string().optional(),
})

async function runNormalize(
  ctx: PhaseContext,
  rawText: string
) {
  const startTs = Date.now()
  emitEvent(ctx, { type: 'phase_started', phase: 'normalize' })
  const normalized = normalizeWorkspaceRunInput(rawText)
  emitEvent(ctx, { type: 'phase_completed', phase: 'normalize', output: normalized })
  recordPhaseTiming(ctx.phaseTimings, 'normalize', startTs, Date.now(), 'orchestration')
  return normalized
}

async function runUnderstand(
  ctx: PhaseContext,
  normalized: ReturnType<typeof normalizeWorkspaceRunInput>,
  runModel: OrchestrateWorkspaceRunOptions['runModel'],
  inheritedCorrections: string[] = []
) {
  const startTs = Date.now()
  emitEvent(ctx, { type: 'phase_started', phase: 'understand' })
  const understanding = await understandWorkspaceRunInput({
    normalized,
    runModel,
    inheritedCorrections,
    signal: ctx.signal,
  })
  emitEvent(ctx, { type: 'phase_completed', phase: 'understand', output: understanding })
  recordPhaseTiming(ctx.phaseTimings, 'understand', startTs, Date.now(), 'model')
  return understanding
}

async function runSemanticSplit(
  ctx: PhaseContext,
  normalized: ReturnType<typeof normalizeWorkspaceRunInput>,
  runModel: OrchestrateWorkspaceRunOptions['runModel']
) {
  const startTs = Date.now()
  emitEvent(ctx, { type: 'phase_started', phase: 'semantic_split' })
  const semanticSplit = await splitWorkspaceRunInputSemantically({
    normalized,
    runModel,
    preferDeterministic: true,
    signal: ctx.signal,
  })
  emitEvent(ctx, { type: 'phase_completed', phase: 'semantic_split', output: semanticSplit })
  recordPhaseTiming(ctx.phaseTimings, 'semantic_split', startTs, Date.now(), 'model')
  return semanticSplit
}

function formatSemanticCorrections(
  corrections: Awaited<ReturnType<typeof runSemanticSplit>>['corrections']
): string[] {
  return corrections.map((correction) =>
    correction.reason
      ? `${correction.from}->${correction.to} (${correction.reason})`
      : `${correction.from}->${correction.to}`
  )
}

function formatTypoCorrections(
  typoCandidates: ReturnType<typeof normalizeWorkspaceRunInput>['typoCandidates']
): string[] {
  return typoCandidates.map((candidate) => `${candidate.text}->${candidate.suggestion} (typo)`)
}

function applyTypoCorrectionsToText(
  text: string,
  typoCandidates: ReturnType<typeof normalizeWorkspaceRunInput>['typoCandidates']
) {
  return typoCandidates.reduce((acc, candidate) => {
    if (candidate.text === candidate.suggestion || !acc.includes(candidate.text)) {
      return acc
    }

    return acc.split(candidate.text).join(candidate.suggestion)
  }, text)
}

function applyTypoCorrections(
  normalized: ReturnType<typeof normalizeWorkspaceRunInput>
): ReturnType<typeof normalizeWorkspaceRunInput> {
  const normalizedText = applyTypoCorrectionsToText(normalized.normalizedText, normalized.typoCandidates)

  if (normalizedText === normalized.normalizedText) {
    return normalized
  }

  return {
    ...normalized,
    normalizedText,
  }
}

function buildUnderstandingInputs(
  normalized: ReturnType<typeof normalizeWorkspaceRunInput>,
  semanticSplit: Awaited<ReturnType<typeof runSemanticSplit>>
): Array<ReturnType<typeof normalizeWorkspaceRunInput>> {
  const groups: Array<{
    rawText: string
    normalizedText: string
    urls: string[]
    separators: string[]
    typoCandidates: ReturnType<typeof normalizeWorkspaceRunInput>['typoCandidates']
    timeHints: string[]
  }> = []

  for (const segment of semanticSplit.segments) {
    const normalizedSegment = normalizeWorkspaceRunInput(
      applyTypoCorrectionsToText(segment.text, normalized.typoCandidates)
    )
    const previousGroup = groups.at(-1)

    const startsNewCaptureGroup =
      segment.relation === 'independent' ||
      segment.operationCue === 'new_capture' ||
      segment.operationCue === 'repeat_capture'

    if (!previousGroup || startsNewCaptureGroup) {
      groups.push(normalizedSegment)
      continue
    }

    previousGroup.rawText = `${previousGroup.rawText}\n${normalizedSegment.rawText}`
    previousGroup.normalizedText = `${previousGroup.normalizedText}\n${normalizedSegment.normalizedText}`
    previousGroup.urls = [...previousGroup.urls, ...normalizedSegment.urls]
    previousGroup.separators = [...previousGroup.separators, ...normalizedSegment.separators]
    previousGroup.typoCandidates = [
      ...previousGroup.typoCandidates,
      ...normalizedSegment.typoCandidates,
    ]
    previousGroup.timeHints = [...previousGroup.timeHints, ...normalizedSegment.timeHints]
  }

  return groups.length > 0 ? groups : [normalized]
}

async function runResolveTodoTimes(
  ctx: PhaseContext,
  draftTasks: DraftWorkspaceTask[],
  fallbackTimeHints: string[],
  referenceTime: string
) {
  const startTs = Date.now()
  emitEvent(ctx, { type: 'phase_started', phase: 'time_normalize' })
  const result = await normalizeTodoDraftTaskTimes(draftTasks, {
    fallbackTimeHints,
    referenceTime,
    signal: ctx.signal,
  })
  emitEvent(ctx, { type: 'phase_completed', phase: 'time_normalize', output: result })
  recordPhaseTiming(ctx.phaseTimings, 'time_normalize', startTs, Date.now(), 'model')
  return result
}

async function runPlan(
  ctx: PhaseContext,
  draftTasks: DraftWorkspaceTask[],
  searchCandidates: OrchestrateWorkspaceRunOptions['searchCandidates'],
  runModel: OrchestrateWorkspaceRunOptions['runModel']
): Promise<WorkspaceRunPlannerResult> {
  const startTs = Date.now()
  emitEvent(ctx, { type: 'phase_started', phase: 'plan' })

  let planSystemPrompt: string | null = null

  const runPlanHints: (input: { draftTask: DraftWorkspaceTask; userPrompt: string }) => Promise<WorkspaceRunPlanHint | null | undefined> = async ({ userPrompt }) => {
    try {
      if (!planSystemPrompt) {
        planSystemPrompt = await buildWorkspaceSystemPrompt('workspace-run/system', {})
      }

      const result = await runModel({
        schema: workspaceRunPlanHintSchema,
        systemPrompt: planSystemPrompt,
        userPrompt,
        signal: ctx.signal,
      })
      return result as WorkspaceRunPlanHint | null
    } catch {
      return null
    }
  }

  const result = await planWorkspaceRun({
    userId: ctx.userId,
    draftTasks,
    searchCandidates,
    runPlanHints,
  })

  emitEvent(ctx, { type: 'phase_completed', phase: 'plan', output: result })
  recordPhaseTiming(ctx.phaseTimings, 'plan', startTs, Date.now(), 'orchestration')
  return result
}

async function runReview(
  ctx: PhaseContext,
  draftTasks: Parameters<typeof reviewWorkspaceRunPlan>[0]['draftTasks'],
  plan: WorkspaceRunPlannerResult,
  understandingPreview: Parameters<typeof reviewWorkspaceRunPlan>[0]['understandingPreview'],
  updatedAt: string,
  referenceTime: string,
  duplicateCandidates: Parameters<typeof reviewWorkspaceRunPlan>[0]['duplicateCandidates']
) {
  const startTs = Date.now()
  emitEvent(ctx, { type: 'phase_started', phase: 'review' })

  const reviewResult = reviewWorkspaceRunPlan({
    runId: ctx.runId,
    draftTasks,
    plan: {
      summary: plan.summary,
      steps: plan.steps.map((step) => ({
        id: step.id,
        action: step.action,
        target: step.target,
        title: step.title,
        risk: step.risk,
        requiresUserApproval: step.requiresUserApproval,
        candidates: step.candidates,
      })),
    },
    understandingPreview,
    updatedAt,
    referenceTime,
    duplicateCandidates,
  })

  emitEvent(ctx, { type: 'phase_completed', phase: 'review', output: reviewResult })
  recordPhaseTiming(ctx.phaseTimings, 'review', startTs, Date.now(), 'orchestration')
  return reviewResult
}

async function runPreview(
  ctx: PhaseContext,
  understandingPreview: Parameters<typeof buildWorkspaceRunPreview>[0]['understandingPreview'],
  plannerResult: WorkspaceRunPlannerResult
) {
  const startTs = Date.now()
  emitEvent(ctx, { type: 'phase_started', phase: 'preview' })

  const preview = buildWorkspaceRunPreview({
    runId: ctx.runId,
    understandingPreview,
    plannerResult,
  })

  emitEvent(ctx, { type: 'phase_completed', phase: 'preview', output: preview })
  recordPhaseTiming(ctx.phaseTimings, 'preview', startTs, Date.now(), 'orchestration')
  return preview
}

async function runExecute(
  ctx: PhaseContext,
  steps: WorkspaceRunPlannerResult['steps'],
  userId: string
) {
  const startTs = Date.now()
  emitEvent(ctx, { type: 'phase_started', phase: 'execute' })

  const toolContext: WorkspaceToolContext = { userId }

  const executeEvents = {
    onToolCallStarted: (event: { toolName: string; preview: string }) => {
      emitEvent(ctx, { type: 'tool_call_started', toolName: event.toolName, preview: event.preview })
    },
    onToolCallCompleted: (event: { toolName: string; result: WorkspaceToolResult }) => {
      emitEvent(ctx, { type: 'tool_call_completed', toolName: event.toolName, result: event.result })
    },
  }

  const result = await executeWorkspaceRunSteps(steps, toolContext, executeEvents)

  emitEvent(ctx, { type: 'phase_completed', phase: 'execute', output: result })
  recordPhaseTiming(ctx.phaseTimings, 'execute', startTs, Date.now(), 'tool')
  return result
}

async function runCompose(
  ctx: PhaseContext,
  task: Parameters<typeof composeWorkspaceAnswer>[0]['task'],
  plan: Parameters<typeof composeWorkspaceAnswer>[0]['plan'],
  data: Parameters<typeof composeWorkspaceAnswer>[0]['data']
) {
  const startTs = Date.now()
  emitEvent(ctx, { type: 'phase_started', phase: 'compose' })

  const result = await composeWorkspaceAnswer({
    task,
    plan,
    data,
  })

  emitEvent(ctx, { type: 'phase_completed', phase: 'compose', output: result })
  recordPhaseTiming(ctx.phaseTimings, 'compose', startTs, Date.now(), 'model')
  return result
}

async function runBatchCompose(
  ctx: PhaseContext,
  input: {
    preview: Awaited<ReturnType<typeof runPreview>>
    executeResult: Awaited<ReturnType<typeof runExecute>>
  }
) {
  const startTs = Date.now()
  emitEvent(ctx, { type: 'phase_started', phase: 'compose' })

  const result = {
    answer: buildBatchAnswer({
      plan: input.preview.plan,
      executeResult: input.executeResult,
    }),
    usedFallback: true,
  }

  emitEvent(ctx, { type: 'phase_completed', phase: 'compose', output: result })
  recordPhaseTiming(ctx.phaseTimings, 'compose', startTs, Date.now(), 'orchestration')
  return result
}

function shouldSkipComposeForSingleMutation(input: {
  executeResult: Awaited<ReturnType<typeof runExecute>>
  understanding: {
    draftTasks: DraftWorkspaceTask[]
  }
}) {
  if (input.executeResult.stepResults.length !== 1) {
    return false
  }

  const task = input.understanding.draftTasks[0]
  if (!task) {
    return false
  }

  return task.intent === 'create' || task.intent === 'update'
}

function assignDraftTaskIds(tasks: DraftWorkspaceTask[]) {
  return tasks.map((task, index) => ({
    ...task,
    id: `draft_${index + 1}`,
  }))
}

export async function handleNewInput(
  options: OrchestrateWorkspaceRunOptions
): Promise<WorkspaceRunOrchestratorResult> {
  const { userId, request, store, runModel, searchCandidates, onEvent } = options

  if (request.kind !== 'input') {
    return { ok: false, phase: 'invalid_request', message: 'Expected input request' }
  }

  const runId = createRunId()
  const updatedAt = new Date().toISOString()

  const ctx: PhaseContext = { runId, userId, onEvent, signal: options.signal, phaseTimings: [] }
  try {
    const normalized = await runNormalize(ctx, request.text)
    const normalizedForUnderstanding = applyTypoCorrections(normalized)

    console.log(`${WS_LOG_PREFIX} normalize`, {
      runId,
      rawInput: request.text,
      normalizedInput: normalizedForUnderstanding.normalizedText,
    })

    const semanticSplit = await runSemanticSplit(ctx, normalizedForUnderstanding, runModel)
    const inheritedCorrections = [
      ...formatSemanticCorrections(semanticSplit.corrections),
      ...formatTypoCorrections(normalizedForUnderstanding.typoCandidates),
    ].filter((value, index, values) => values.indexOf(value) === index)
    const understandingInputs = buildUnderstandingInputs(normalizedForUnderstanding, semanticSplit)
    const understandingResults: Awaited<ReturnType<typeof runUnderstand>>[] = []
    for (const segmentInput of understandingInputs) {
      understandingResults.push(
        await runUnderstand(ctx, segmentInput, runModel, inheritedCorrections)
      )
    }
    const understanding = {
      rawInput: normalized.rawText,
      normalizedInput: normalizedForUnderstanding.normalizedText,
      corrections: inheritedCorrections,
      draftTasks: assignDraftTaskIds(
        understandingResults.flatMap((result) => result.draftTasks)
      ),
    }

    console.log(`${WS_LOG_PREFIX} understanding`, {
      runId,
      draftTasks: understanding.draftTasks.map((t) => ({
        id: t.id,
        intent: t.intent,
        target: t.target,
        title: t.title,
        confidence: t.confidence,
        slots: t.slots,
      })),
    })

    const normalizedDraftTasks = await runResolveTodoTimes(
      ctx,
      understanding.draftTasks,
      normalized.timeHints,
      updatedAt
    )
    const normalizedUnderstanding = {
      ...understanding,
      draftTasks: normalizedDraftTasks,
    }

    const draftTasks = normalizedUnderstanding.draftTasks as Parameters<typeof reviewWorkspaceRunPlan>[0]['draftTasks']

    const duplicateCandidates = normalizedUnderstanding.draftTasks.length === 1
      ? await (async () => {
          const candidate = await findWorkspaceCreateDuplicateCandidate({
            userId,
            draftTask: normalizedUnderstanding.draftTasks[0],
            stepId: 'step_1',
          })
          return candidate ? [candidate] : []
        })()
      : await findWorkspaceCreateDuplicateCandidates({
          userId,
          draftTasks: normalizedUnderstanding.draftTasks,
        })

    const plannerResult = await runPlan(ctx, normalizedUnderstanding.draftTasks, searchCandidates, runModel)

    console.log(`${WS_LOG_PREFIX} plan`, {
      runId,
      steps: plannerResult.steps.map((s: WorkspaceRunPlannerStep) => ({
        id: s.id,
        action: s.action,
        target: s.target,
        title: s.title,
        selector: s.selector,
        patch: s.patch,
        candidateCount: s.candidates?.length ?? 0,
      })),
    })

    const reviewResult = await runReview(
      ctx,
      draftTasks,
      plannerResult,
      normalizedUnderstanding,
      updatedAt,
      updatedAt,
      duplicateCandidates
    )

    console.log(`${WS_LOG_PREFIX} review`, {
      runId,
      status: reviewResult.status,
      reason: reviewResult.status === 'reject' || reviewResult.status === 'await_user' ? reviewResult.reason : undefined,
    })

    if (reviewResult.status === 'reject') {
      emitEvent(ctx, {
        type: 'run_failed',
        error: {
          code: 'REJECTED',
          message: `Run rejected: ${reviewResult.reason}`,
          retryable: false,
        },
      })

      return {
        ok: false,
        phase: 'review',
        message: `Run rejected: ${reviewResult.reason}`,
        phaseTimings: ctx.phaseTimings,
      }
    }

    if (reviewResult.status === 'auto_execute') {
      const preview = await runPreview(ctx, normalizedUnderstanding, plannerResult)
      const executeResult = await runExecute(ctx, plannerResult.steps, userId)

      console.log(`${WS_LOG_PREFIX} execute`, {
        runId,
        stepResults: executeResult.stepResults.map((r) => ({
          stepId: r.stepId,
          toolName: r.toolName,
          ok: r.result.ok,
          ...(r.result.ok
            ? { target: r.result.target, total: r.result.total, action: r.result.action }
            : { error: r.result.message }),
        })),
      })

      const failedStep = executeResult.stepResults.find((r) => !r.result.ok)
      if (failedStep) {
        const errorInfo = getToolResultError(failedStep.result)
        await store.updateRunStatus(runId, userId, 'failed')

        emitEvent(ctx, {
          type: 'run_failed',
          error: {
            code: errorInfo?.code ?? 'EXECUTION_ERROR',
            message: errorInfo?.message ?? 'Step execution failed',
            retryable: true,
          },
        })

        return {
          ok: false,
          phase: 'execute',
          message: errorInfo?.message ?? 'Step execution failed',
          phaseTimings: ctx.phaseTimings,
        }
      }

      const firstOkResult = executeResult.stepResults.find((r) => r.result.ok)?.result

      if (firstOkResult && firstOkResult.ok) {
        const primaryTask = normalizedUnderstanding.draftTasks[0]
        const primaryPlan = {
          intent: primaryTask.intent as WorkspaceIntent,
          target: primaryTask.target as WorkspaceTarget,
          toolName: plannerResult.steps[0]
            ? getToolNameFromAction(plannerResult.steps[0].action)
            : 'create_todo',
          toolInput: {},
          needsCompose: true,
        }

        const composeResult = executeResult.stepResults.length > 1
          ? await runBatchCompose(ctx, { preview, executeResult })
          : shouldSkipComposeForSingleMutation({
              executeResult,
              understanding: normalizedUnderstanding,
            })
            ? {
                answer: buildFallbackAnswer(
                  {
                    intent: primaryTask.intent as WorkspaceIntent,
                    target: primaryTask.target as Exclude<WorkspaceTarget, 'mixed'>,
                  },
                  firstOkResult
                ),
                usedFallback: true,
              }
            : await runCompose(
                ctx,
                {
                  intent: primaryTask.intent as WorkspaceIntent,
                  target: primaryTask.target as Exclude<WorkspaceTarget, 'mixed'>,
                },
                primaryPlan,
                firstOkResult
              )

        await store.updateRunStatus(runId, userId, 'completed')

        emitEvent(ctx, {
          type: 'run_completed',
          result: buildCompletedRunResult({
            executeResult,
            answer: composeResult.answer,
            preview,
            data: executeResult.stepResults.length > 1 ? null : firstOkResult,
          }),
        })

        return {
          ok: true,
          phase: 'completed',
          result: buildCompletedRunResult({
            executeResult,
            answer: composeResult.answer,
            preview,
            data: executeResult.stepResults.length > 1 ? null : firstOkResult,
          }),
          phaseTimings: ctx.phaseTimings,
        }
      }

      return {
        ok: false,
        phase: 'execute',
        message: 'No successful step results',
        phaseTimings: ctx.phaseTimings,
      }
    }

    if (reviewResult.status === 'await_user') {
      await store.failAwaitingRuns(userId)
      await store.saveSnapshot(reviewResult.snapshot, userId)

      emitEvent(ctx, {
        type: 'awaiting_user',
        interaction: reviewResult.snapshot.interaction as WorkspaceInteraction,
      })

      return {
        ok: true,
        phase: 'review',
        snapshot: reviewResult.snapshot,
        phaseTimings: ctx.phaseTimings,
      }
    }

    return {
      ok: false,
      phase: 'review',
      message: 'Unknown review decision',
      phaseTimings: ctx.phaseTimings,
    }
  } catch (error) {
    const errorCode = isWorkspaceRunModelError(error) ? error.code : 'INTERNAL_ERROR'
    const retryable = isWorkspaceRunModelError(error) ? error.retryable : false

    emitEvent(ctx, {
      type: 'run_failed',
      error: {
        code: errorCode,
        message: error instanceof Error ? error.message : 'Internal error',
        retryable,
      },
    })

    return {
      ok: false,
      phase: 'error',
      message: error instanceof Error ? error.message : 'Internal error',
      phaseTimings: ctx.phaseTimings,
    }
  }
}
