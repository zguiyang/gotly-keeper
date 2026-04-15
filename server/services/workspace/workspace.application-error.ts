import 'server-only'

export const WORKSPACE_APPLICATION_ERROR_CODES = {
  TODO_NOT_FOUND: 'TODO_NOT_FOUND',
} as const

export type WorkspaceApplicationErrorCode = (typeof WORKSPACE_APPLICATION_ERROR_CODES)[keyof typeof WORKSPACE_APPLICATION_ERROR_CODES]

export class WorkspaceApplicationError extends Error {
  constructor(
    public readonly publicMessage: string,
    public readonly code: WorkspaceApplicationErrorCode = WORKSPACE_APPLICATION_ERROR_CODES.TODO_NOT_FOUND
  ) {
    super(publicMessage)
    this.name = 'WorkspaceApplicationError'
  }
}
