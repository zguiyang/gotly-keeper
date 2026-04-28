import { requireWorkspaceUserAccess } from '@/server/modules/auth/workspace-session'
import { createWorkspaceRunRuntime } from '@/server/modules/workspace-agent'
import { orchestrateWorkspaceRun } from '@/server/modules/workspace-agent/workspace-run-orchestrator'
import { workspaceRunRequestSchema } from '@/shared/workspace/workspace-run-protocol'

import type { WorkspaceRunRequest } from '@/shared/workspace/workspace-run-protocol'

function encodeSseEvent(event: unknown) {
  return `event: ${(event as { type: string }).type}\ndata: ${JSON.stringify(event)}\n\n`
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ runId: string }> | { runId: string } }
) {
  const user = await requireWorkspaceUserAccess()
  const { runId } = await params

  let body: unknown

  try {
    body = await req.json()
  } catch {
    return Response.json({ error: '请求体格式不正确。' }, { status: 400 })
  }

  const parsed = workspaceRunRequestSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: '请求参数无效。' }, { status: 400 })
  }

  const request = parsed.data as WorkspaceRunRequest

  if (request.kind !== 'resume' || request.runId !== runId) {
    return Response.json({ error: '请求参数无效。' }, { status: 400 })
  }

  const { store, runModel, searchCandidates } = createWorkspaceRunRuntime()

  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false

      const closeController = () => {
        if (closed) {
          return
        }
        closed = true
        controller.close()
      }

      const handleAbort = () => {
        closeController()
      }

      req.signal.addEventListener('abort', handleAbort, { once: true })

      const writeEvent = (event: unknown) => {
        if (closed || req.signal.aborted) {
          return
        }
        controller.enqueue(encoder.encode(encodeSseEvent(event)))
      }

      try {
        await orchestrateWorkspaceRun({
          userId: user.id,
          request,
          store,
          runModel,
          searchCandidates,
          onEvent: writeEvent,
          signal: req.signal,
        })

        if (req.signal.aborted) {
          return
        }
      } catch {
        if (req.signal.aborted) {
          return
        }

        writeEvent({
          type: 'run_failed',
          error: {
            code: 'INTERNAL_ERROR',
            message: '处理失败，请重试。',
            retryable: true,
          },
        })
      } finally {
        req.signal.removeEventListener('abort', handleAbort)
        closeController()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
      'content-type': 'text/event-stream; charset=utf-8',
      'x-accel-buffering': 'no',
    },
  })
}
