'use client'

import { toast } from 'sonner'

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
        console.error('[client-action]', error)
        return error instanceof Error ? error.message : options.error ?? '操作失败，请重试。'
      },
    })
    return promise
  }

  try {
    return await action()
  } catch (error) {
    console.error('[client-action]', error)
    toast.error(error instanceof Error ? error.message : '操作失败，请重试。')
    throw error
  }
}
