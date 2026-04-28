import 'server-only'

import { ACTION_LABELS } from './workspace-run-action-labels'

import type { WorkspaceRunPlannerResult } from './workspace-run-planner'
import type {
  WorkspacePlanPreview,
  WorkspaceRunPreview,
  WorkspaceUnderstandingPreview,
} from '@/shared/workspace/workspace-run-protocol'
export type WorkspaceRunPreviewInput = {
  runId: string
  understandingPreview: WorkspaceUnderstandingPreview | null
  plannerResult: WorkspaceRunPlannerResult
}

function mapPlannerStepToPreviewStep(step: WorkspaceRunPlannerResult['steps'][number]): {
  id: string
  toolName: string
  title: string
  preview: string
} {
  return {
    id: step.id,
    toolName: step.action,
    title: ACTION_LABELS[step.action] ?? step.action,
    preview: `${ACTION_LABELS[step.action] ?? step.action}：${step.title ?? ''}`.trimEnd(),
  }
}

function toPlanPreview(plan: WorkspaceRunPlannerResult): WorkspacePlanPreview {
  return {
    summary: plan.summary,
    steps: plan.steps.map(mapPlannerStepToPreviewStep),
  }
}

export function buildWorkspaceRunPreview(input: WorkspaceRunPreviewInput): WorkspaceRunPreview {
  const planPreview = toPlanPreview(input.plannerResult)

  return {
    understanding: input.understandingPreview ?? undefined,
    plan: planPreview,
  }
}

