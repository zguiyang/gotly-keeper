import 'server-only'

import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
  type UIMessageStreamWriter,
} from 'ai'

import {
  buildQuickActionWorkspaceCommand,
  executeWorkspaceCommand,
  resolveWorkspaceCommand,
} from './index'

import type {
  WorkspaceRunRequest,
  WorkspaceRunStage,
} from '@/shared/workspace/workspace-run.types'

export { toWorkspaceRunResult } from './workspace-run-result'

export const QUICK_ACTION_PROMPTS = {
  'review-todos': '请复盘我当前未完成的待办，提炼重点、风险和下一步行动。',
  'summarize-notes': '请总结我最近的笔记，提炼关键信息和下一步行动。',
  'summarize-bookmarks': '请总结我最近收藏的书签，提炼值得关注的主题和下一步行动。',
} as const

export function resolveWorkspaceRunPrompt(request: WorkspaceRunRequest) {
  return request.kind === 'input' ? request.text : QUICK_ACTION_PROMPTS[request.action]
}

async function resolveWorkspaceRunCommand(request: WorkspaceRunRequest) {
  if (request.kind === 'quick-action') {
    return buildQuickActionWorkspaceCommand(request.action)
  }

  return resolveWorkspaceCommand({ text: request.text })
}

type WorkspaceStreamMessage = UIMessage<{ stage?: WorkspaceRunStage }>

function writeAssistantText(
  writer: UIMessageStreamWriter<WorkspaceStreamMessage>,
  text: string
) {
  const textId = crypto.randomUUID()
  writer.write({ type: 'text-start', id: textId })
  writer.write({ type: 'text-delta', id: textId, delta: text })
  writer.write({ type: 'text-end', id: textId })
}

function writeStage(
  writer: UIMessageStreamWriter<WorkspaceStreamMessage>,
  stage: WorkspaceRunStage,
  text: string
) {
  writer.write({ type: 'message-metadata', messageMetadata: { stage } })
  writeAssistantText(writer, text)
}

export function streamWorkspaceRun(options: {
  userId: string
  request: WorkspaceRunRequest
}) {
  const stream = createUIMessageStream<WorkspaceStreamMessage>({
    execute: async ({ writer }) => {
      writer.write({
        type: 'start',
        messageMetadata: { stage: 'understanding' },
      })
      writeAssistantText(writer, '正在理解你的请求')

      writeStage(writer, 'structuring', '正在结构化理解请求')
      const command = await resolveWorkspaceRunCommand(options.request)

      writeStage(writer, 'executing', '正在执行结构化命令')
      const toolCallId = crypto.randomUUID()
      writer.write({
        type: 'tool-input-available',
        toolCallId,
        toolName: command.operation,
        input: command,
      })

      const result = await executeWorkspaceCommand({
        userId: options.userId,
        command,
      })

      writer.write({
        type: 'tool-output-available',
        toolCallId,
        output: result,
      })
      writer.write({ type: 'finish-step' })
      writer.write({
        type: 'finish',
        finishReason: 'stop',
        messageMetadata: { stage: 'finalizing' },
      })
    },
  })

  return createUIMessageStreamResponse({ stream })
}

export function getWorkspaceRunMessageMetadata(part: {
  type: string
}): { stage: WorkspaceRunStage } | undefined {
  if (part.type === 'start') {
    return { stage: 'understanding' }
  }

  if (part.type === 'message-metadata') {
    return { stage: 'structuring' }
  }

  if (part.type === 'tool-call' || part.type === 'tool-result') {
    return { stage: 'executing' }
  }

  if (part.type === 'finish-step' || part.type === 'finish') {
    return { stage: 'finalizing' }
  }

  return undefined
}
