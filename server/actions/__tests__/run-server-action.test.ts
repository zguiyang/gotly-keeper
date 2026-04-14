import { describe, it, mock, beforeEach } from 'node:test'
import assert from 'node:assert'
import { runServerAction } from '../run-server-action'
import { ActionError, ACTION_ERROR_CODES } from '../action-error'

describe('runServerAction', () => {
  const mockConsoleInfo = mock.fn()
  const mockConsoleError = mock.fn()

  beforeEach(() => {
    mockConsoleInfo.mock.resetCalls()
    mockConsoleError.mock.resetCalls()
  })

  describe('success path', () => {
    it('logs with action, requestId, durationMs, and status=success', async () => {
      const originalInfo = console.info
      console.info = mockConsoleInfo

      try {
        await runServerAction('testAction', async () => {
          return 'result'
        })

        assert.strictEqual(mockConsoleInfo.mock.callCount(), 1)
        const logCall = mockConsoleInfo.mock.calls[0]
        const logData = logCall.arguments[1]

        assert.strictEqual(logData.action, 'testAction')
        assert.ok(logData.requestId, 'requestId should be present')
        assert.ok(typeof logData.durationMs === 'number', 'durationMs should be a number')
        assert.strictEqual(logData.status, 'success')
      } finally {
        console.info = originalInfo
      }
    })

    it('returns the result from the handler', async () => {
      const result = await runServerAction('testAction', async () => {
        return { success: true }
      })
      assert.deepStrictEqual(result, { success: true })
    })
  })

  describe('error path', () => {
    it('throws public-safe message from normalized error', async () => {
      const originalError = console.error
      console.error = mockConsoleError

      try {
        const actionError = new ActionError('用户未登录', ACTION_ERROR_CODES.UNAUTHENTICATED)

        await assert.rejects(
          async () => {
            await runServerAction('testAction', async () => {
              throw actionError
            })
          },
          (error) => {
            assert.ok(error instanceof Error)
            assert.strictEqual((error as Error).message, '用户未登录')
            return true
          }
        )
      } finally {
        console.error = originalError
      }
    })

    it('logs stable error fields on failure', async () => {
      const originalError = console.error
      console.error = mockConsoleError

      try {
        const actionError = new ActionError('无权限', ACTION_ERROR_CODES.UNAUTHENTICATED)

        await assert.rejects(async () => {
          await runServerAction('authAction', async () => {
            throw actionError
          })
        })

        assert.strictEqual(mockConsoleError.mock.callCount(), 1)
        const logCall = mockConsoleError.mock.calls[0]
        const logData = logCall.arguments[1]

        assert.strictEqual(logData.action, 'authAction')
        assert.ok(logData.requestId, 'requestId should be present')
        assert.ok(typeof logData.durationMs === 'number', 'durationMs should be a number')
        assert.strictEqual(logData.status, 'error')
        assert.strictEqual(logData.errorCode, ACTION_ERROR_CODES.UNAUTHENTICATED)
        assert.strictEqual(logData.errorMessage, '无权限')
        assert.strictEqual(logData.errorName, 'ActionError')
      } finally {
        console.error = originalError
      }
    })

    it('handles non-ActionError as unknown error', async () => {
      const originalError = console.error
      console.error = mockConsoleError

      try {
        await assert.rejects(
          async () => {
            await runServerAction('unknownError', async () => {
              throw new Error('internal error details')
            })
          },
          (error) => {
            assert.ok(error instanceof Error)
            assert.strictEqual((error as Error).message, '操作失败，请重试。')
            return true
          }
        )

        const logCall = mockConsoleError.mock.calls[0]
        const logData = logCall.arguments[1]

        assert.strictEqual(logData.errorCode, ACTION_ERROR_CODES.UNKNOWN_ACTION_ERROR)
        assert.strictEqual(logData.errorMessage, '操作失败，请重试。')
        assert.strictEqual(logData.errorName, 'Error')
      } finally {
        console.error = originalError
      }
    })
  })
})