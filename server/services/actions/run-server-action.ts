import 'server-only'

import { unstable_rethrow } from 'next/navigation'

import { normalizeActionError } from './action-error'

type ServerActionContext = {
  requestId: string
}

export async function runServerAction<T>(
  action: string,
  handler: (context: ServerActionContext) => Promise<T>
): Promise<T> {
  const requestId = crypto.randomUUID()
  const startedAt = Date.now()

  try {
    const result = await handler({ requestId })

    console.info('[server-action]', {
      action,
      requestId,
      durationMs: Date.now() - startedAt,
      status: 'success',
    })

    return result
  } catch (error) {
    unstable_rethrow(error)

    const normalized = normalizeActionError(error)
    const durationMs = Date.now() - startedAt

    console.error('[server-action]', {
      action,
      requestId,
      durationMs,
      status: 'error',
      errorCode: normalized.code,
      errorMessage: normalized.publicMessage,
      errorName: error instanceof Error ? error.name : 'UnknownError',
    })

    throw new Error(normalized.publicMessage)
  }
}
