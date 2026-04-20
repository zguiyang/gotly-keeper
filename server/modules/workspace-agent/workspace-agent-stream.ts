import 'server-only'

import {
  createAgentUIStream,
  createUIMessageStream,
  createUIMessageStreamResponse,
} from 'ai'

import { createWorkspaceAgent } from './workspace-agent'

import type { WorkspaceAgentRequest } from './workspace-agent.types'

export const QUICK_ACTION_PROMPTS = {
  'review-todos': '请复盘我当前未完成的待办，提炼重点、风险和下一步行动。',
  'summarize-notes': '请总结我最近的笔记，提炼关键信息和下一步行动。',
  'summarize-bookmarks': '请总结我最近收藏的书签，提炼值得关注的主题和下一步行动。',
} as const

export function resolveWorkspaceAgentPrompt(request: WorkspaceAgentRequest) {
  return request.kind === 'input' ? request.text : QUICK_ACTION_PROMPTS[request.action]
}

export async function streamWorkspaceAgentRun(options: {
  userId: string
  request: WorkspaceAgentRequest
}) {
  const agent = await createWorkspaceAgent({ userId: options.userId })

  if (!agent) {
    return Response.json({ error: 'AI 服务暂不可用，请稍后重试。' }, { status: 503 })
  }

  const uiMessages = [
    {
      id: crypto.randomUUID(),
      role: 'user' as const,
      parts: [{ type: 'text' as const, text: resolveWorkspaceAgentPrompt(options.request) }],
      metadata: options.request,
    },
  ]

  const stream = createUIMessageStream({
    async execute({ writer }) {
      writer.write({
        type: 'data-workspace-trace',
        data: {
          type: 'finalized',
          title: '整理结果',
          summary: '已接收请求，正在调用智能体。',
        },
      })

      const agentStream = await createAgentUIStream({
        agent,
        uiMessages,
      })

      writer.merge(agentStream)
    },
  })

  return createUIMessageStreamResponse({ stream })
}
