import { describe, it, expect } from 'vitest'
import {
  ActionError,
  ACTION_ERROR_CODES,
  getActionErrorMessage,
  isActionError,
  normalizeActionError,
} from '@/server/modules/actions/action-error'

describe('action-error', () => {
  describe('getActionErrorMessage', () => {
    it('returns publicMessage for ActionError', () => {
      const error = new ActionError('具体错误信息', ACTION_ERROR_CODES.EMPTY_INPUT)
      const message = getActionErrorMessage(error)
      expect(message).toBe('具体错误信息')
    })

    it('returns fallback for unknown errors', () => {
      const error = new Error('some error')
      const fallback = '默认错误信息'
      const message = getActionErrorMessage(error, fallback)
      expect(message).toBe(fallback)
    })
  })

  describe('normalizeActionError', () => {
    it('known ActionError keeps code and message', () => {
      const error = new ActionError('用户未登录', ACTION_ERROR_CODES.UNAUTHENTICATED)
      const result = normalizeActionError(error)
      expect(result.code).toBe(ACTION_ERROR_CODES.UNAUTHENTICATED)
      expect(result.publicMessage).toBe('用户未登录')
    })

    it('unknown error maps to fallback code and message', () => {
      const error = new Error('some internal error')
      const fallback = '操作失败，请重试。'
      const result = normalizeActionError(error, fallback)
      expect(result.code).toBe(ACTION_ERROR_CODES.UNKNOWN_ACTION_ERROR)
      expect(result.publicMessage).toBe(fallback)
    })

    it('preserves requestId from ActionError when present', () => {
      const error = new ActionError('服务器错误', ACTION_ERROR_CODES.UNKNOWN_ACTION_ERROR)
      ;(error as ActionError & { requestId?: string }).requestId = 'req_123'
      const result = normalizeActionError(error)
      expect(result.requestId).toBe('req_123')
    })

    it('does not include requestId when not present on ActionError', () => {
      const error = new ActionError('无权限', ACTION_ERROR_CODES.UNAUTHENTICATED)
      const result = normalizeActionError(error)
      expect(result.requestId).toBe(undefined)
    })
  })

  describe('isActionError', () => {
    it('returns true for ActionError instances', () => {
      const error = new ActionError('test', ACTION_ERROR_CODES.EMPTY_INPUT)
      expect(isActionError(error)).toBe(true)
    })

    it('returns false for plain Error', () => {
      const error = new Error('plain error')
      expect(isActionError(error)).toBe(false)
    })

    it('returns false for null', () => {
      expect(isActionError(null)).toBe(false)
    })

    it('returns false for undefined', () => {
      expect(isActionError(undefined)).toBe(false)
    })
  })
})
