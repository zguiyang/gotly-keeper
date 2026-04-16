import { describe, it, expect } from 'vitest'

import {
  ModuleActionError,
  MODULE_ACTION_ERROR_CODES,
  getModuleActionErrorMessage,
  isModuleActionError,
  normalizeModuleActionError,
} from '@/server/modules/actions/action-error'

describe('action-error', () => {
  describe('getModuleActionErrorMessage', () => {
    it('returns publicMessage for ModuleActionError', () => {
      const error = new ModuleActionError('具体错误信息', MODULE_ACTION_ERROR_CODES.EMPTY_INPUT)
      const message = getModuleActionErrorMessage(error)
      expect(message).toBe('具体错误信息')
    })

    it('returns fallback for unknown errors', () => {
      const error = new Error('some error')
      const fallback = '默认错误信息'
      const message = getModuleActionErrorMessage(error, fallback)
      expect(message).toBe(fallback)
    })
  })

  describe('normalizeModuleActionError', () => {
    it('known ModuleActionError keeps code and message', () => {
      const error = new ModuleActionError('用户未登录', MODULE_ACTION_ERROR_CODES.UNAUTHENTICATED)
      const result = normalizeModuleActionError(error)
      expect(result.code).toBe(MODULE_ACTION_ERROR_CODES.UNAUTHENTICATED)
      expect(result.publicMessage).toBe('用户未登录')
    })

    it('unknown error maps to fallback code and message', () => {
      const error = new Error('some internal error')
      const fallback = '操作失败，请重试。'
      const result = normalizeModuleActionError(error, fallback)
      expect(result.code).toBe(MODULE_ACTION_ERROR_CODES.UNKNOWN_ACTION_ERROR)
      expect(result.publicMessage).toBe(fallback)
    })

    it('preserves requestId from ModuleActionError when present', () => {
      const error = new ModuleActionError('服务器错误', MODULE_ACTION_ERROR_CODES.UNKNOWN_ACTION_ERROR)
      ;(error as ModuleActionError & { requestId?: string }).requestId = 'req_123'
      const result = normalizeModuleActionError(error)
      expect(result.requestId).toBe('req_123')
    })

    it('does not include requestId when not present on ModuleActionError', () => {
      const error = new ModuleActionError('无权限', MODULE_ACTION_ERROR_CODES.UNAUTHENTICATED)
      const result = normalizeModuleActionError(error)
      expect(result.requestId).toBe(undefined)
    })
  })

  describe('isModuleActionError', () => {
    it('returns true for ModuleActionError instances', () => {
      const error = new ModuleActionError('test', MODULE_ACTION_ERROR_CODES.EMPTY_INPUT)
      expect(isModuleActionError(error)).toBe(true)
    })

    it('returns false for plain Error', () => {
      const error = new Error('plain error')
      expect(isModuleActionError(error)).toBe(false)
    })

    it('returns false for null', () => {
      expect(isModuleActionError(null)).toBe(false)
    })

    it('returns false for undefined', () => {
      expect(isModuleActionError(undefined)).toBe(false)
    })
  })
})
