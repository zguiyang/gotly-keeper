import 'server-only'

import { runAiGeneration } from '@/server/lib/ai/ai-runner'
import { isAiProviderError, isAiSchemaError, isAiTimeoutError } from '@/server/lib/ai/ai.errors'


import { createWorkspaceRunStore } from './workspace-run-store.drizzle'
import { understandingModelResultSchema, type WorkspaceRunModel } from './workspace-run-understanding'
import { executeWorkspaceTool } from './workspace-tools'

import type { SearchWorkspaceRunCandidates } from './workspace-run-planner'
import type { AssetListItem } from '@/shared/assets/assets.types'

export class WorkspaceRunModelError extends Error {
  readonly code: string
  readonly retryable: boolean
  readonly cause: unknown

  constructor(message: string, options: { code: string; retryable: boolean; cause: unknown }) {
    super(message)
    this.name = 'WorkspaceRunModelError'
    this.code = options.code
    this.retryable = options.retryable
    this.cause = options.cause
  }
}

export function isWorkspaceRunModelError(
  error: unknown
): error is Pick<WorkspaceRunModelError, 'message' | 'code' | 'retryable'> {
  return (
    error instanceof Error &&
    typeof (error as { code?: unknown }).code === 'string' &&
    typeof (error as { retryable?: unknown }).retryable === 'boolean'
  )
}

function toWorkspaceRunModelError(error: unknown): WorkspaceRunModelError {
  if (isAiTimeoutError(error)) {
    return new WorkspaceRunModelError(error.message, {
      code: 'AI_TIMEOUT',
      retryable: true,
      cause: error,
    })
  }

  if (isAiSchemaError(error)) {
    return new WorkspaceRunModelError(error.message, {
      code: 'AI_SCHEMA_ERROR',
      retryable: false,
      cause: error,
    })
  }

  if (isAiProviderError(error)) {
    return new WorkspaceRunModelError(error.message, {
      code: 'AI_PROVIDER_ERROR',
      retryable: true,
      cause: error,
    })
  }

  return new WorkspaceRunModelError(
    error instanceof Error ? error.message : 'AI generation failed',
    {
      code: 'AI_GENERATION_FAILED',
      retryable: false,
      cause: error,
    }
  )
}

function createRunModel(): WorkspaceRunModel {
  return async (input) => {
    const result = await runAiGeneration({
      schema: understandingModelResultSchema,
      systemPrompt: input.systemPrompt,
      userPrompt: input.userPrompt,
    })

    if (!result.success) {
      throw toWorkspaceRunModelError(result.error)
    }

    return result.data
  }
}

function createSearchCandidates(): SearchWorkspaceRunCandidates {
  return async (input) => {
    try {
      const result = await executeWorkspaceTool(
        {
          toolName: 'search_todos',
          toolInput: { query: input.query, status: 'all' },
        },
        { userId: input.userId }
      )

      if (!result.ok || !result.items) {
        return []
      }

      return (result.items as AssetListItem[]).map((item) => ({
        id: item.id,
        type: 'todo' as const,
        title: item.title ?? '',
        confidence: 0.8,
        matchReason: `匹配关键词: ${input.query}`,
      }))
    } catch {
      return []
    }
  }
}

export function createWorkspaceRunRuntime() {
  return {
    store: createWorkspaceRunStore(),
    runModel: createRunModel(),
    searchCandidates: createSearchCandidates(),
  }
}
