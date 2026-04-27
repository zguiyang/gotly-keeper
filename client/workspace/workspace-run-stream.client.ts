'use client'

import type {
  WorkspaceRunRequest,
  WorkspaceRunStreamEvent,
} from '@/shared/workspace/workspace-runner.types'

type WorkspaceRunStreamCallbacks = {
  onEvent: (event: WorkspaceRunStreamEvent) => void
}

function isWorkspaceRunStreamEvent(value: unknown): value is WorkspaceRunStreamEvent {
  if (!value || typeof value !== 'object' || !('type' in value)) {
    return false
  }

  return value.type === 'phase' || value.type === 'result' || value.type === 'error'
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

  const parsed = JSON.parse(dataLines.join('\n')) as unknown
  return isWorkspaceRunStreamEvent(parsed) ? parsed : null
}

async function readWorkspaceRunStream(
  body: ReadableStream<Uint8Array>,
  callbacks: WorkspaceRunStreamCallbacks
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
        callbacks.onEvent(event)
      }
    }
  }

  const remaining = buffer.trim()
  if (remaining) {
    const event = parseSseFrame(remaining)
    if (event) {
      callbacks.onEvent(event)
    }
  }
}

export async function streamWorkspaceRun(
  body: WorkspaceRunRequest,
  callbacks: WorkspaceRunStreamCallbacks,
  options: {
    signal?: AbortSignal
  } = {}
) {
  const response = await fetch('/api/workspace/run', {
    method: 'POST',
    headers: {
      accept: 'text/event-stream',
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: options.signal,
  })

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(payload?.error ?? '处理失败，请重试。')
  }

  if (!response.body) {
    throw new Error('服务端没有返回处理流，请重试。')
  }

  await readWorkspaceRunStream(response.body, callbacks)
}
