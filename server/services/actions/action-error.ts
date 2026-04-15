import 'server-only'

export const ACTION_ERROR_CODES = {
  EMPTY_INPUT: 'EMPTY_INPUT',
  INVALID_TODO_COMPLETION_INPUT: 'INVALID_TODO_COMPLETION_INPUT',
  TODO_NOT_FOUND: 'TODO_NOT_FOUND',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  UNKNOWN_ACTION_ERROR: 'UNKNOWN_ACTION_ERROR',
} as const

export type ActionErrorCode = (typeof ACTION_ERROR_CODES)[keyof typeof ACTION_ERROR_CODES]

export class ActionError extends Error {
  constructor(
    public readonly publicMessage: string,
    public readonly code: ActionErrorCode = ACTION_ERROR_CODES.UNKNOWN_ACTION_ERROR
  ) {
    super(publicMessage)
    this.name = 'ActionError'
  }
}

export interface NormalizedActionError {
  code: ActionErrorCode
  publicMessage: string
  requestId?: string
}

export function isActionError(error: unknown): error is ActionError {
  return error instanceof ActionError
}

export function normalizeActionError(
  error: unknown,
  fallbackMessage = '操作失败，请重试。'
): NormalizedActionError {
  if (isActionError(error)) {
    return {
      code: error.code,
      publicMessage: error.publicMessage,
      requestId: 'requestId' in error ? (error.requestId as string | undefined) : undefined,
    }
  }

  return {
    code: ACTION_ERROR_CODES.UNKNOWN_ACTION_ERROR,
    publicMessage: fallbackMessage,
  }
}

export function getActionErrorMessage(error: unknown, fallback = '操作失败，请重试。') {
  return normalizeActionError(error, fallback).publicMessage
}
