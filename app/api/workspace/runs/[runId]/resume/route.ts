import { getServerLocale, getServerTranslation } from '@/hooks/use-locale.server'
import { requireWorkspaceUserAccess } from '@/server/modules/auth/workspace-session'
import { createWorkspaceRunRuntime } from '@/server/modules/workspace-agent'
import { orchestrateWorkspaceRun } from '@/server/modules/workspace-agent/workspace-run-orchestrator'
import { workspaceRunRequestSchema } from '@/shared/workspace/workspace-run-protocol'

import { encodeSseEvent, SSE_RESPONSE_HEADERS } from '../../sse-utils'

import type { WorkspaceRunRequest } from '@/shared/workspace/workspace-run-protocol'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ runId: string }> | { runId: string } }
) {
  const user = await requireWorkspaceUserAccess()
  const locale = await getServerLocale()
  const t = await getServerTranslation('common.errors')
  const { runId } = await params

  let body: unknown

  try {
    body = await req.json()
  } catch {
    return Response.json({ error: t('invalidRequest') }, { status: 400 })
  }

  const parsed = workspaceRunRequestSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: t('invalidParams') }, { status: 400 })
  }

  const request: WorkspaceRunRequest = parsed.data

  if (request.kind !== 'resume' || request.runId !== runId) {
    return Response.json({ error: t('invalidParams') }, { status: 400 })
  }

  const { store, runModel, searchCandidates } = createWorkspaceRunRuntime(locale)

  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false

      const closeController = () => {
        if (closed) return
        closed = true
        controller.close()
      }

      const handleAbort = () => closeController()
      req.signal.addEventListener('abort', handleAbort, { once: true })

      const writeEvent = (event: Parameters<typeof encodeSseEvent>[0]) => {
        if (closed || req.signal.aborted) return
        controller.enqueue(encoder.encode(encodeSseEvent(event)))
      }

      try {
        await orchestrateWorkspaceRun({
          userId: user.id,
          locale,
          request,
          store,
          runModel,
          searchCandidates,
          onEvent: writeEvent,
          signal: req.signal,
        })

        if (req.signal.aborted) return
      } catch {
        if (req.signal.aborted) return

        writeEvent({
          type: 'run_failed',
          error: { code: 'INTERNAL_ERROR', message: t('generic'), retryable: true },
        })
      } finally {
        req.signal.removeEventListener('abort', handleAbort)
        closeController()
      }
    },
  })

  return new Response(stream, { headers: SSE_RESPONSE_HEADERS })
}
