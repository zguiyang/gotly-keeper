import 'server-only'

import {
  createAgentUIStream,
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
} from 'ai'

import { createWorkspaceAgent } from './workspace-agent'

import type { WorkspaceAgentRequest } from './workspace-agent.types'

type WorkspaceStreamMessage = UIMessage<WorkspaceAgentRequest>

export const QUICK_ACTION_PROMPTS = {
  'review-todos': '请复盘我当前未完成的待办，提炼重点、风险和下一步行动。',
  'summarize-notes': '请总结我最近的笔记，提炼关键信息和下一步行动。',
  'summarize-bookmarks': '请总结我最近收藏的书签，提炼值得关注的主题和下一步行动。',
} as const

export function resolveWorkspaceAgentPrompt(request: WorkspaceAgentRequest) {
  return request.kind === 'input' ? request.text : QUICK_ACTION_PROMPTS[request.action]
}

function getLatestAssistantMessage(messages: WorkspaceStreamMessage[]) {
  return [...messages].reverse().find((message) => message.role === 'assistant') ?? null
}

function hasStructuredToolResult(message: WorkspaceStreamMessage | null) {
  if (!message) {
    return false
  }

  return message.parts.some((part) => {
    if (!part.type.startsWith('tool-')) {
      return false
    }

    if (!('state' in part) || part.state !== 'output-available') {
      return false
    }

    if (!('output' in part) || !part.output || typeof part.output !== 'object') {
      return false
    }

    return 'result' in part.output
  })
}

function getAssistantTextPreview(message: WorkspaceStreamMessage | null) {
  if (!message) {
    return null
  }

  const text = message.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text.trim())
    .filter(Boolean)
    .join('\n\n')

  return text.length > 160 ? `${text.slice(0, 160)}...` : text || null
}

function logIncompleteStructuredRun(input: {
  userId: string
  request: WorkspaceAgentRequest
  finishReason: string | undefined
  assistantTextPreview: string | null
}) {
  console.warn('[workspace-agent] completed without structured tool result', {
    userId: input.userId,
    requestKind: input.request.kind,
    requestPreview: resolveWorkspaceAgentPrompt(input.request).slice(0, 160),
    finishReason: input.finishReason ?? 'unknown',
    assistantTextPreview: input.assistantTextPreview,
  })
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
    originalMessages: uiMessages,
    onFinish: ({ messages, responseMessage, finishReason }) => {
      const latestAssistantMessage =
        responseMessage.role === 'assistant'
          ? responseMessage
          : getLatestAssistantMessage(messages as WorkspaceStreamMessage[])

      if (hasStructuredToolResult(latestAssistantMessage as WorkspaceStreamMessage | null)) {
        return
      }

      logIncompleteStructuredRun({
        userId: options.userId,
        request: options.request,
        finishReason,
        assistantTextPreview: getAssistantTextPreview(
          latestAssistantMessage as WorkspaceStreamMessage | null
        ),
      })
    },
    onError: (error) => {
      console.error('[workspace-agent] stream failed', {
        userId: options.userId,
        requestKind: options.request.kind,
        requestPreview: resolveWorkspaceAgentPrompt(options.request).slice(0, 160),
        error: error instanceof Error ? error.message : String(error),
      })

      return 'AI 服务暂时不稳定，请稍后重试。'
    },
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
