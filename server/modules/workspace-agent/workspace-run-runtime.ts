import 'server-only'

import { runAiGeneration } from '@/server/lib/ai/ai-runner'

import type { AssetListItem } from '@/shared/assets/assets.types'

import { createWorkspaceRunStore } from './workspace-run-store.drizzle'
import { understandingResultSchema, type WorkspaceRunModel } from './workspace-run-understanding'
import { executeWorkspaceTool } from './workspace-tools'

import type { SearchWorkspaceRunCandidates } from './workspace-run-planner'

function createRunModel(): WorkspaceRunModel {
  return async (input) => {
    const result = await runAiGeneration({
      schema: understandingResultSchema,
      systemPrompt: input.systemPrompt,
      userPrompt: input.userPrompt,
    })

    if (!result.success) {
      throw new Error('AI generation failed')
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
