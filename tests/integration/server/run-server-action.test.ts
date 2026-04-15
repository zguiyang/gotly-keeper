import { describe, it, expect, beforeEach, vi } from 'vitest'
import { runServerAction } from '../../../server/actions/run-server-action'
import { ActionError, ACTION_ERROR_CODES } from '../../../server/actions/action-error'

describe('runServerAction', () => {
  const mockConsoleInfo = vi.fn()
  const mockConsoleError = vi.fn()

  beforeEach(() => {
    mockConsoleInfo.mockClear()
    mockConsoleError.mockClear()
  })

  describe('success path', () => {
    it('logs with action, requestId, durationMs, and status=success', async () => {
      const originalInfo = console.info
      console.info = mockConsoleInfo

      try {
        await runServerAction('testAction', async () => {
          return 'result'
        })

        expect(mockConsoleInfo).toHaveBeenCalledTimes(1)
        const logCall = mockConsoleInfo.mock.calls[0]
        const logData = logCall[1]

        expect(logData.action).toBe('testAction')
        expect(logData.requestId).toBeTruthy()
        expect(typeof logData.durationMs).toBe('number')
        expect(logData.status).toBe('success')
      } finally {
        console.info = originalInfo
      }
    })

    it('returns the result from the handler', async () => {
      const result = await runServerAction('testAction', async () => {
        return { success: true }
      })
      expect(result).toEqual({ success: true })
    })
  })

  describe('error path', () => {
    it('throws public-safe message from normalized error', async () => {
      const originalError = console.error
      console.error = mockConsoleError

      try {
        const actionError = new ActionError('用户未登录', ACTION_ERROR_CODES.UNAUTHENTICATED)

        await expect(
          runServerAction('testAction', async () => {
            throw actionError
          })
        ).rejects.toThrow('用户未登录')
      } finally {
        console.error = originalError
      }
    })

    it('logs stable error fields on failure', async () => {
      const originalError = console.error
      console.error = mockConsoleError

      try {
        const actionError = new ActionError('无权限', ACTION_ERROR_CODES.UNAUTHENTICATED)

        await expect(
          runServerAction('authAction', async () => {
            throw actionError
          })
        ).rejects.toThrow()

        expect(mockConsoleError).toHaveBeenCalledTimes(1)
        const logCall = mockConsoleError.mock.calls[0]
        const logData = logCall[1]

        expect(logData.action).toBe('authAction')
        expect(logData.requestId).toBeTruthy()
        expect(typeof logData.durationMs).toBe('number')
        expect(logData.status).toBe('error')
        expect(logData.errorCode).toBe(ACTION_ERROR_CODES.UNAUTHENTICATED)
        expect(logData.errorMessage).toBe('无权限')
        expect(logData.errorName).toBe('ActionError')
      } finally {
        console.error = originalError
      }
    })

    it('handles non-ActionError as unknown error', async () => {
      const originalError = console.error
      console.error = mockConsoleError

      try {
        await expect(
          runServerAction('unknownError', async () => {
            throw new Error('internal error details')
          })
        ).rejects.toThrow('操作失败，请重试。')

        const logCall = mockConsoleError.mock.calls[0]
        const logData = logCall[1]

        expect(logData.errorCode).toBe(ACTION_ERROR_CODES.UNKNOWN_ACTION_ERROR)
        expect(logData.errorMessage).toBe('操作失败，请重试。')
        expect(logData.errorName).toBe('Error')
      } finally {
        console.error = originalError
      }
    })
  })
})