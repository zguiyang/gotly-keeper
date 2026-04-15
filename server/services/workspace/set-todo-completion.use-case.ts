import 'server-only'

import { WorkspaceApplicationError, WORKSPACE_APPLICATION_ERROR_CODES } from './workspace.application-error'
import { setTodoCompletion } from '@/server/services/assets/assets.service'
import type { SetTodoCompletionInput, AssetListItem } from './workspace.types'

export async function setTodoCompletionUseCase(
  input: SetTodoCompletionInput
): Promise<AssetListItem> {
  const updated = await setTodoCompletion({
    userId: input.userId,
    assetId: input.assetId,
    completed: input.completed,
  })

  if (!updated) {
    throw new WorkspaceApplicationError(
      '没有找到这条待办，或你没有权限更新它。',
      WORKSPACE_APPLICATION_ERROR_CODES.TODO_NOT_FOUND
    )
  }

  return updated
}
