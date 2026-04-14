'use client'

import { toast } from 'sonner'

function resolveErrorMessage(error: unknown, fallbackMessage?: string): string {
  if (fallbackMessage !== undefined) {
    return fallbackMessage
  }
  if (error instanceof Error && error.message) {
    return error.message
  }
  return '操作失败，请重试。'
}

export async function callAction<T>(
  action: () => Promise<T>,
  options?: {
    loading?: string
    success?: string
    error?: string
  }
): Promise<T> {
  if (options?.loading || options?.success || options?.error) {
    const promise = Promise.resolve().then(action)
    toast.promise(promise, {
      loading: options.loading,
      success: options.success,
      error: (error) => {
        console.error('[client-action]', error instanceof Error ? error.message : error)
        return resolveErrorMessage(error, options.error)
      },
    })
    return promise
  }

  try {
    return await action()
  } catch (error) {
    console.error('[client-action]', error instanceof Error ? error.message : error)
    toast.error(resolveErrorMessage(error, options?.error))
    throw error
  }
}
