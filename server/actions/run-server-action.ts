import 'server-only'

import { unstable_rethrow } from 'next/navigation'

import { ActionError, getActionErrorMessage } from './action-error'

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

    console.error('[server-action]', {
      action,
      requestId,
      durationMs: Date.now() - startedAt,
      status: 'error',
      code: error instanceof ActionError ? error.code : 'UNKNOWN',
      error,
    })

    throw new Error(getActionErrorMessage(error))
  }
}
