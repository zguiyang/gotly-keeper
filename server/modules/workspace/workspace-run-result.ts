import type { WorkspaceAssetActionResult } from '@/shared/assets/assets.types'
import type { WorkspaceRunResult } from '@/shared/workspace/workspace-run.types'

export function toWorkspaceRunResult(
  result: WorkspaceAssetActionResult
): WorkspaceRunResult {
  if (result.kind === 'created' && result.asset.type === 'link') {
    return {
      kind: 'created',
      asset: result.asset,
      notice: '已保存书签，页面信息会稍后补全。',
    }
  }

  return result
}
