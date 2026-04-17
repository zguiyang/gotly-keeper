import 'server-only'

export const MODULE_ACTION_ERROR_CODES = {
  EMPTY_INPUT: 'EMPTY_INPUT',
  INVALID_TODO_COMPLETION_INPUT: 'INVALID_TODO_COMPLETION_INPUT',
  INVALID_ASSET_INPUT: 'INVALID_ASSET_INPUT',
  TODO_NOT_FOUND: 'TODO_NOT_FOUND',
  ASSET_NOT_FOUND: 'ASSET_NOT_FOUND',
  INVALID_LIFECYCLE_TRANSITION: 'INVALID_LIFECYCLE_TRANSITION',
  PURGE_REQUIRES_TRASHED_ASSET: 'PURGE_REQUIRES_TRASHED_ASSET',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  UNKNOWN_ACTION_ERROR: 'UNKNOWN_ACTION_ERROR',
} as const

export type ModuleActionErrorCode = (typeof MODULE_ACTION_ERROR_CODES)[keyof typeof MODULE_ACTION_ERROR_CODES]

export class ModuleActionError extends Error {
  constructor(
    public readonly publicMessage: string,
    public readonly code: ModuleActionErrorCode = MODULE_ACTION_ERROR_CODES.UNKNOWN_ACTION_ERROR
  ) {
    super(publicMessage)
    this.name = 'ModuleActionError'
  }
}

export interface NormalizedModuleActionError {
  code: ModuleActionErrorCode
  publicMessage: string
  requestId?: string
}

export function isModuleActionError(error: unknown): error is ModuleActionError {
  return error instanceof ModuleActionError
}

export function normalizeModuleActionError(
  error: unknown,
  fallbackMessage = '操作失败，请重试。'
): NormalizedModuleActionError {
  if (isModuleActionError(error)) {
    return {
      code: error.code,
      publicMessage: error.publicMessage,
      requestId: 'requestId' in error ? (error.requestId as string | undefined) : undefined,
    }
  }

  return {
    code: MODULE_ACTION_ERROR_CODES.UNKNOWN_ACTION_ERROR,
    publicMessage: fallbackMessage,
  }
}

export function getModuleActionErrorMessage(error: unknown, fallback = '操作失败，请重试。') {
  return normalizeModuleActionError(error, fallback).publicMessage
}
