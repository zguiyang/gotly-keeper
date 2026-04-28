import 'server-only'

import { executeWorkspaceTool } from './workspace-tools'

import type { WorkspaceToolContext, WorkspaceToolResult } from './types'
import type { WorkspaceRunPlannerStep } from './workspace-run-planner'
import type { workspaceTools } from './workspace-tools'

export type WorkspaceRunExecutorStepResult = {
  stepId: string
  toolName: string
  result: WorkspaceToolResult
}

export type WorkspaceRunExecutorResult = {
  stepResults: WorkspaceRunExecutorStepResult[]
  summary: string
}

export type WorkspaceRunExecutorEvents = {
  onToolCallStarted?: (event: { toolName: string; preview: string }) => void
  onToolCallCompleted?: (event: { toolName: string; result: WorkspaceToolResult }) => void
}

const actionToToolMap: Record<string, keyof typeof workspaceTools> = {
  create_note: 'create_note',
  create_todo: 'create_todo',
  create_bookmark: 'create_bookmark',
  update_todo: 'update_todo',
  query_assets: 'search_all',
  summarize_assets: 'search_all',
}

function getToolForAction(action: string): keyof typeof workspaceTools | null {
  return actionToToolMap[action] ?? null
}

function buildToolInputForStep(step: WorkspaceRunPlannerStep): Record<string, unknown> {
  const baseInput: Record<string, unknown> = {
    ...(step.toolInput ?? {}),
  }

  if (Object.keys(baseInput).length === 0 && step.title) {
    if (step.action === 'create_note') {
      baseInput.content = step.title
    } else if (step.action === 'create_todo') {
      baseInput.title = step.title
    } else if (step.action === 'create_bookmark') {
      baseInput.title = step.title
    } else if (step.action === 'update_todo') {
      baseInput.selector = {}
      baseInput.patch = {}
    }
  }

  if (step.candidates && step.candidates.length > 0 && step.action === 'update_todo') {
    const firstCandidate = step.candidates[0]
    if (firstCandidate) {
      baseInput.selector = {
        ...((baseInput.selector as Record<string, unknown> | undefined) ?? {}),
        id: firstCandidate.id,
      }
      baseInput.patch = {
        ...((baseInput.patch as Record<string, unknown> | undefined) ?? {}),
        status: 'done',
      }
    }
  }

  return baseInput
}

export async function executeWorkspaceRunSteps(
  steps: WorkspaceRunPlannerStep[],
  context: WorkspaceToolContext,
  events?: WorkspaceRunExecutorEvents
): Promise<WorkspaceRunExecutorResult> {
  const stepResults: WorkspaceRunExecutorStepResult[] = []

  for (const step of steps) {
    const toolName = getToolForAction(step.action)

    if (!toolName) {
      stepResults.push({
        stepId: step.id,
        toolName: step.action,
        result: {
          ok: false,
          code: 'UNSUPPORTED_ACTION',
          message: `Unsupported action: ${step.action}`,
        },
      })
      continue
    }

    const toolInput = buildToolInputForStep(step)

    events?.onToolCallStarted?.({
      toolName: toolName,
      preview: `${step.title ?? step.action}`,
    })

    try {
      const result = await executeWorkspaceTool(
        {
          toolName,
          toolInput,
        },
        context
      )

      events?.onToolCallCompleted?.({
        toolName: toolName,
        result,
      })

      stepResults.push({
        stepId: step.id,
        toolName: toolName,
        result,
      })

      if (!result.ok) {
        break
      }
    } catch (error) {
      const errorResult: WorkspaceToolResult = {
        ok: false,
        code: 'EXECUTION_ERROR',
        message: error instanceof Error ? error.message : 'Unknown execution error',
      }

      events?.onToolCallCompleted?.({
        toolName: toolName,
        result: errorResult,
      })

      stepResults.push({
        stepId: step.id,
        toolName: toolName,
        result: errorResult,
      })

      break
    }
  }

  const successCount = stepResults.filter((r) => r.result.ok).length
  const totalCount = stepResults.length
  const summary = `执行了 ${successCount}/${totalCount} 个步骤`

  return {
    stepResults,
    summary,
  }
}

export function isWorkspaceRunExecutorResult(value: unknown): value is WorkspaceRunExecutorResult {
  return (
    typeof value === 'object' &&
    value !== null &&
    'stepResults' in value &&
    Array.isArray((value as WorkspaceRunExecutorResult).stepResults)
  )
}
