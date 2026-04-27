'use client'

import {
  workspaceRunStreamEventSchema,
  type WorkspaceInteraction,
  type WorkspacePlanPreview,
  type WorkspaceRunRequest,
  type WorkspaceRunStreamEvent,
  type WorkspaceUnderstandingPreview,
} from '@/shared/workspace/workspace-run-protocol'

type WorkspaceRunEventHandlers = {
  onEvent: (event: WorkspaceRunStreamEvent) => void
  onError?: (error: Error) => void
}

function parseSseFrame(frame: string): WorkspaceRunStreamEvent | null {
  const lines = frame.split('\n')
  const dataLines: string[] = []

  for (const line of lines) {
    if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trimStart())
    }
  }

  if (dataLines.length === 0) {
    return null
  }

  try {
    const parsed = JSON.parse(dataLines.join('\n')) as unknown
    const result = workspaceRunStreamEventSchema.safeParse(parsed)
    if (result.success) {
      return result.data
    }
    return null
  } catch {
    return null
  }
}

async function readSseStream(
  body: ReadableStream<Uint8Array>,
  handlers: WorkspaceRunEventHandlers
) {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) {
      break
    }

    buffer += decoder.decode(value, { stream: true })
    buffer = buffer.replaceAll('\r\n', '\n')

    while (buffer.includes('\n\n')) {
      const separatorIndex = buffer.indexOf('\n\n')
      const frame = buffer.slice(0, separatorIndex)
      buffer = buffer.slice(separatorIndex + 2)

      const event = parseSseFrame(frame)
      if (event) {
        handlers.onEvent(event)
      }
    }
  }

  const remaining = buffer.trim()
  if (remaining) {
    const event = parseSseFrame(remaining)
    if (event) {
      handlers.onEvent(event)
    }
  }
}

export type StreamWorkspaceRunOptions = {
  signal?: AbortSignal
}

export async function streamWorkspaceRunEvents(
  request: WorkspaceRunRequest,
  handlers: WorkspaceRunEventHandlers,
  options: StreamWorkspaceRunOptions = {}
) {
  const url =
    request.kind === 'resume'
      ? `/api/workspace/runs/${request.runId}/resume`
      : '/api/workspace/runs'

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      accept: 'text/event-stream',
      'content-type': 'application/json',
    },
    body: JSON.stringify(request),
    signal: options.signal,
  })

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(payload?.error ?? '处理失败，请重试。')
  }

  if (!response.body) {
    throw new Error('服务端没有返回处理流，请重试。')
  }

  await readSseStream(response.body, handlers)
}

export type FetchCurrentWorkspaceRunResult = {
  ok: true
  run: {
    runId: string
    interaction: WorkspaceInteraction
    timeline: WorkspaceRunStreamEvent[]
    understandingPreview: WorkspaceUnderstandingPreview | null
    planPreview: WorkspacePlanPreview | null
    correctionNotes: string[]
    updatedAt: string
  } | null
}

export async function fetchCurrentWorkspaceRun(): Promise<FetchCurrentWorkspaceRunResult> {
  const response = await fetch('/api/workspace/runs/current', {
    method: 'GET',
    headers: {
      accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('获取当前运行状态失败。')
  }

  return response.json() as Promise<FetchCurrentWorkspaceRunResult>
}