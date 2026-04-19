import 'server-only'

import { stepCountIs, streamText } from 'ai'

import { getAiProvider } from '@/server/lib/ai/ai-provider'
import type { WorkspaceAssetActionResult } from '@/shared/assets/assets.types'
import type {
  WorkspaceRunRequest,
  WorkspaceRunResult,
  WorkspaceRunStage,
} from '@/shared/workspace/workspace-run.types'

import { buildWorkspaceToolRulesPrompt } from './workspace-tool-rules'
import { createWorkspaceTools } from './workspace-tools'

export const QUICK_ACTION_PROMPTS = {
  'review-todos': '请复盘我当前未完成的待办，提炼重点、风险和下一步行动。',
  'summarize-notes': '请总结我最近的笔记，提炼关键信息和下一步行动。',
  'summarize-bookmarks': '请总结我最近收藏的书签，提炼值得关注的主题和下一步行动。',
} as const

export function buildWorkspaceRunSystemPrompt() {
  return [
    '你是 Gotly 的 workspace 助手。',
    '你的职责是从有限工具中选择一个最合适的工具。',
    '如果用户是新增内容，优先选择 create_*。',
    '如果用户是查询历史内容，选择 search_assets。',
    '如果用户是要求总结，选择 summarize_workspace。',
    '不要捏造工具，不要同时调用多个工具。',
    buildWorkspaceToolRulesPrompt(),
  ].join('\n\n')
}

export function resolveWorkspaceRunPrompt(request: WorkspaceRunRequest) {
  return request.kind === 'input' ? request.text : QUICK_ACTION_PROMPTS[request.action]
}

export function streamWorkspaceRun(options: {
  userId: string
  request: WorkspaceRunRequest
}) {
  const model = getAiProvider()

  if (!model) {
    return null
  }

  return streamText({
    model,
    system: buildWorkspaceRunSystemPrompt(),
    prompt: resolveWorkspaceRunPrompt(options.request),
    tools: createWorkspaceTools(options.userId),
    stopWhen: stepCountIs(2),
    temperature: 0,
    providerOptions: {
      alibaba: {
        enableThinking: false,
      },
    },
  })
}

export function getWorkspaceRunMessageMetadata(part: {
  type: string
}): { stage: WorkspaceRunStage } | undefined {
  if (part.type === 'start') {
    return { stage: 'understanding' }
  }

  if (part.type === 'tool-call' || part.type === 'tool-result') {
    return { stage: 'executing' }
  }

  if (part.type === 'finish-step' || part.type === 'finish') {
    return { stage: 'finalizing' }
  }

  return undefined
}

export function toWorkspaceRunResult(
  result: WorkspaceAssetActionResult
): WorkspaceRunResult {
  if (result.kind === 'created' && result.asset.type === 'link') {
    return {
      kind: 'created',
      asset: result.asset,
      notice: '已保存书签，页面信息会稍后补全。',
    }
  }

  return result
}
