import { describe, it, mock } from 'node:test'
import assert from 'node:assert'
import {
  ActionError,
  ACTION_ERROR_CODES,
  getActionErrorMessage,
  isActionError,
  normalizeActionError,
  type NormalizedActionError,
} from '../action-error'

describe('action-error', () => {
  describe('getActionErrorMessage', () => {
    it('returns publicMessage for ActionError', () => {
      const error = new ActionError('具体错误信息', ACTION_ERROR_CODES.EMPTY_INPUT)
      const message = getActionErrorMessage(error)
      assert.strictEqual(message, '具体错误信息')
    })

    it('returns fallback for unknown errors', () => {
      const error = new Error('some error')
      const fallback = '默认错误信息'
      const message = getActionErrorMessage(error, fallback)
      assert.strictEqual(message, fallback)
    })
  })

  describe('normalizeActionError', () => {
    it('known ActionError keeps code and message', () => {
      const error = new ActionError('用户未登录', ACTION_ERROR_CODES.UNAUTHENTICATED)
      const result = normalizeActionError(error)
      assert.strictEqual(result.code, ACTION_ERROR_CODES.UNAUTHENTICATED)
      assert.strictEqual(result.publicMessage, '用户未登录')
    })

    it('unknown error maps to fallback code and message', () => {
      const error = new Error('some internal error')
      const fallback = '操作失败，请重试。'
      const result = normalizeActionError(error, fallback)
      assert.strictEqual(result.code, ACTION_ERROR_CODES.UNKNOWN_ACTION_ERROR)
      assert.strictEqual(result.publicMessage, fallback)
    })

    it('preserves requestId from ActionError when present', () => {
      const error = new ActionError('服务器错误', ACTION_ERROR_CODES.UNKNOWN_ACTION_ERROR)
      ;(error as ActionError & { requestId?: string }).requestId = 'req_123'
      const result = normalizeActionError(error)
      assert.strictEqual(result.requestId, 'req_123')
    })

    it('does not include requestId when not present on ActionError', () => {
      const error = new ActionError('无权限', ACTION_ERROR_CODES.UNAUTHENTICATED)
      const result = normalizeActionError(error)
      assert.strictEqual(result.requestId, undefined)
    })
  })

  describe('isActionError', () => {
    it('returns true for ActionError instances', () => {
      const error = new ActionError('test', ACTION_ERROR_CODES.EMPTY_INPUT)
      assert.strictEqual(isActionError(error), true)
    })

    it('returns false for plain Error', () => {
      const error = new Error('plain error')
      assert.strictEqual(isActionError(error), false)
    })

    it('returns false for null', () => {
      assert.strictEqual(isActionError(null), false)
    })

    it('returns false for undefined', () => {
      assert.strictEqual(isActionError(undefined), false)
    })
  })
})
