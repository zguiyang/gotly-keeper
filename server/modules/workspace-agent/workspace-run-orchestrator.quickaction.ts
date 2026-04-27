import type { OrchestrateWorkspaceRunOptions } from './workspace-run-orchestrator'

import { handleNewInput } from './workspace-run-orchestrator.input'

const QUICK_ACTION_PROMPTS = {
  'review-todos': '总结最近待办重点',
  'summarize-notes': '总结最近笔记重点',
  'summarize-bookmarks': '总结最近收藏的书签重点',
} as const

export async function handleQuickAction(
  options: OrchestrateWorkspaceRunOptions
): Promise<{
  ok: boolean
  phase?: string
  message?: string
  result?: unknown
}> {
  const { request } = options

  if (request.kind !== 'quick-action') {
    return {
      ok: false,
      phase: 'invalid_request',
      message: 'Expected quick-action request',
    }
  }

  return handleNewInput({
    ...options,
    request: {
      kind: 'input',
      text: QUICK_ACTION_PROMPTS[request.action],
    },
  })
}
