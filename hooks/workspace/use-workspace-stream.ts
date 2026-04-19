'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, type UIMessage } from 'ai'
import { useCallback, useMemo } from 'react'

import type {
  WorkspaceRunRequest,
  WorkspaceRunResult,
  WorkspaceRunStage,
} from '@/shared/workspace/workspace-run.types'

export type WorkspaceRunUiState = {
  status: 'idle' | 'streaming' | 'success' | 'error'
  stage: WorkspaceRunStage | null
  stageMessage: string | null
  result: WorkspaceRunResult | null
  errorMessage: string | null
}

type WorkspaceLauncherMessageMetadata = WorkspaceRunRequest | { stage?: WorkspaceRunStage }

type WorkspaceLauncherMessage = UIMessage<WorkspaceLauncherMessageMetadata>

type WorkspaceToolPart = {
  type: string
  state?: string
  output?: unknown
}

function isWorkspaceRunRequest(value: unknown): value is WorkspaceRunRequest {
  if (!value || typeof value !== 'object' || !('kind' in value)) {
    return false
  }

  if (value.kind === 'input') {
    return 'text' in value && typeof value.text === 'string'
  }

  if (value.kind === 'quick-action') {
    return (
      'action' in value &&
      (value.action === 'review-todos' ||
        value.action === 'summarize-notes' ||
        value.action === 'summarize-bookmarks')
    )
  }

  return false
}

function isWorkspaceRunResult(value: unknown): value is WorkspaceRunResult {
  if (!value || typeof value !== 'object' || !('kind' in value)) {
    return false
  }

  return (
    value.kind === 'created' ||
    value.kind === 'query' ||
    value.kind === 'todo-review' ||
    value.kind === 'note-summary' ||
    value.kind === 'bookmark-summary'
  )
}

function getLatestAssistantMessage(messages: WorkspaceLauncherMessage[]) {
  return [...messages].reverse().find((message) => message.role === 'assistant') ?? null
}

function getResultFromMessage(
  message: WorkspaceLauncherMessage | null
): WorkspaceRunResult | null {
  if (!message) {
    return null
  }

  for (const part of [...message.parts].reverse()) {
    const toolPart = part as WorkspaceToolPart

    if (
      toolPart.type.startsWith('tool-') &&
      toolPart.state === 'output-available' &&
      isWorkspaceRunResult(toolPart.output)
    ) {
      return toolPart.output
    }
  }

  return null
}

function getStageMessage(message: WorkspaceLauncherMessage | null): string | null {
  if (!message) {
    return null
  }

  for (const part of [...message.parts].reverse()) {
    if (part.type === 'text') {
      const text = part.text.trim()
      if (text.length > 0) {
        return text
      }
    }
  }

  return null
}

function getStageFromMessage(
  message: WorkspaceLauncherMessage | null
): WorkspaceRunStage | null {
  const metadata = message?.metadata

  if (metadata && 'stage' in metadata && metadata.stage) {
    return metadata.stage
  }

  return null
}

function toWorkspaceRunUiState(options: {
  messages: WorkspaceLauncherMessage[]
  status: 'submitted' | 'streaming' | 'ready' | 'error'
  error?: Error
}): WorkspaceRunUiState {
  const latestAssistantMessage = getLatestAssistantMessage(options.messages)
  const result = getResultFromMessage(latestAssistantMessage)

  if (options.status === 'error') {
    return {
      status: 'error',
      stage: null,
      stageMessage: null,
      result: null,
      errorMessage: options.error?.message ?? '处理失败，请重试。',
    }
  }

  if (options.status === 'submitted' || options.status === 'streaming') {
    return {
      status: 'streaming',
      stage: getStageFromMessage(latestAssistantMessage) ?? 'understanding',
      stageMessage: getStageMessage(latestAssistantMessage),
      result: null,
      errorMessage: null,
    }
  }

  if (result) {
    return {
      status: 'success',
      stage: null,
      stageMessage: null,
      result,
      errorMessage: null,
    }
  }

  return {
    status: 'idle',
    stage: null,
    stageMessage: null,
    result: null,
    errorMessage: null,
  }
}

function getRequestFromMessages(messages: WorkspaceLauncherMessage[]): WorkspaceRunRequest {
  const latestUserMessage = [...messages].reverse().find((message) => message.role === 'user')
  const metadata = latestUserMessage?.metadata

  if (isWorkspaceRunRequest(metadata)) {
    return metadata
  }

  throw new Error('Workspace launcher request metadata is missing.')
}

export function useWorkspaceStream(options: {
  onResult?: (result: WorkspaceRunResult) => void
} = {}) {
  const transport = useMemo(
    () =>
      new DefaultChatTransport<WorkspaceLauncherMessage>({
        api: '/api/workspace/run',
        prepareSendMessagesRequest: ({ messages }) => ({
          body: getRequestFromMessages(messages),
        }),
      }),
    []
  )

  const { messages, sendMessage, status, error, clearError } = useChat<WorkspaceLauncherMessage>({
    transport,
    onFinish: ({ message }) => {
      const result = getResultFromMessage(message)

      if (result) {
        options.onResult?.(result)
      }
    },
  })

  const state = useMemo(
    () => toWorkspaceRunUiState({ messages, status, error }),
    [messages, status, error]
  )

  const submitInput = useCallback(
    async (text: string) => {
      clearError()
      await sendMessage({
        text,
        metadata: { kind: 'input', text },
      })
    },
    [clearError, sendMessage]
  )

  const triggerQuickAction = useCallback(
    async (action: Extract<WorkspaceRunRequest, { kind: 'quick-action' }>['action']) => {
      clearError()
      await sendMessage({
        parts: [],
        metadata: { kind: 'quick-action', action },
      })
    },
    [clearError, sendMessage]
  )

  return {
    state,
    submitInput,
    triggerQuickAction,
  }
}
