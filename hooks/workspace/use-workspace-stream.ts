'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, type UIMessage } from 'ai'
import { useCallback, useMemo } from 'react'

import type {
  WorkspaceAgentToolOutput,
  WorkspaceAgentTraceEvent,
  WorkspaceRunRequest,
  WorkspaceRunResult,
} from '@/shared/workspace/workspace-run.types'

export type WorkspaceRunUiState = {
  status: 'idle' | 'streaming' | 'success' | 'error'
  assistantText: string | null
  traceEvents: WorkspaceAgentTraceEvent[]
  result: WorkspaceRunResult | null
  errorMessage: string | null
}

type WorkspaceLauncherMessageMetadata = WorkspaceRunRequest

type WorkspaceLauncherMessage = UIMessage<WorkspaceLauncherMessageMetadata>

type WorkspaceToolPart = {
  type: string
  state?: string
  output?: unknown
  errorText?: unknown
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
    value.kind === 'bookmark-summary' ||
    value.kind === 'capabilities'
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
      toolPart.output &&
      typeof toolPart.output === 'object' &&
      'result' in toolPart.output &&
      isWorkspaceRunResult((toolPart.output as WorkspaceAgentToolOutput).result)
    ) {
      return (toolPart.output as WorkspaceAgentToolOutput).result
    }
  }

  return null
}

function getToolErrorFromMessage(message: WorkspaceLauncherMessage | null): string | null {
  if (!message) {
    return null
  }

  for (const part of [...message.parts].reverse()) {
    const toolPart = part as WorkspaceToolPart

    if (
      toolPart.type.startsWith('tool-') &&
      toolPart.state === 'output-error'
    ) {
      return typeof toolPart.errorText === 'string'
        ? toolPart.errorText
        : 'AI 工具执行失败。'
    }
  }

  return null
}

function hasStartedWorkspaceRun(messages: WorkspaceLauncherMessage[]): boolean {
  return messages.some((message) => message.role === 'user' || message.role === 'assistant')
}

function toToolErrorMessage(toolError: string): string {
  const normalizedError = toolError.toLowerCase()
  const isParameterError =
    normalizedError.includes('invalid input') ||
    normalizedError.includes('missing required') ||
    normalizedError.includes('required') ||
    normalizedError.includes('schema') ||
    normalizedError.includes('validation') ||
    normalizedError.includes('expected') ||
    normalizedError.includes('zod')

  return isParameterError
    ? 'AI 工具调用参数不完整，请换个说法重试。'
    : 'AI 工具执行失败，请稍后重试。'
}

function getAssistantText(message: WorkspaceLauncherMessage | null): string | null {
  if (!message) {
    return null
  }

  const text = message.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text.trim())
    .filter(Boolean)
    .join('\n\n')

  return text || null
}

function getTraceEvents(message: WorkspaceLauncherMessage | null): WorkspaceAgentTraceEvent[] {
  if (!message) {
    return []
  }

  const events: WorkspaceAgentTraceEvent[] = []

  for (const part of message.parts) {
    if (part.type === 'data-workspace-trace' && 'data' in part) {
      events.push(part.data as WorkspaceAgentTraceEvent)
    }

    const toolPart = part as WorkspaceToolPart
    if (
      toolPart.type.startsWith('tool-') &&
      toolPart.state === 'output-available' &&
      toolPart.output &&
      typeof toolPart.output === 'object' &&
      'trace' in toolPart.output &&
      Array.isArray((toolPart.output as WorkspaceAgentToolOutput).trace)
    ) {
      events.push(...(toolPart.output as WorkspaceAgentToolOutput).trace)
    }
  }

  return events
}

function toWorkspaceRunUiState(options: {
  messages: WorkspaceLauncherMessage[]
  status: 'submitted' | 'streaming' | 'ready' | 'error'
  error?: Error
}): WorkspaceRunUiState {
  const latestAssistantMessage = getLatestAssistantMessage(options.messages)
  const result = getResultFromMessage(latestAssistantMessage)
  const toolError = getToolErrorFromMessage(latestAssistantMessage)
  const hasStartedRun = hasStartedWorkspaceRun(options.messages)

  if (options.status === 'error') {
    return {
      status: 'error',
      assistantText: null,
      traceEvents: [],
      result: null,
      errorMessage: options.error?.message ?? '处理失败，请重试。',
    }
  }

  if (options.status === 'submitted' || options.status === 'streaming') {
    return {
      status: 'streaming',
      assistantText: getAssistantText(latestAssistantMessage),
      traceEvents: getTraceEvents(latestAssistantMessage),
      result: null,
      errorMessage: null,
    }
  }

  if (result) {
    return {
      status: 'success',
      assistantText: getAssistantText(latestAssistantMessage),
      traceEvents: getTraceEvents(latestAssistantMessage),
      result,
      errorMessage: null,
    }
  }

  if (toolError) {
    return {
      status: 'error',
      assistantText: getAssistantText(latestAssistantMessage),
      traceEvents: getTraceEvents(latestAssistantMessage),
      result: null,
      errorMessage: toToolErrorMessage(toolError),
    }
  }

  if (hasStartedRun) {
    return {
      status: 'error',
      assistantText: getAssistantText(latestAssistantMessage),
      traceEvents: getTraceEvents(latestAssistantMessage),
      result: null,
      errorMessage: 'AI 本次未完成结构化处理，请重试。',
    }
  }

  return {
    status: 'idle',
    assistantText: getAssistantText(latestAssistantMessage),
    traceEvents: getTraceEvents(latestAssistantMessage),
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
