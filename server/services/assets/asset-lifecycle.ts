import 'server-only'

import {
  ASSET_LIFECYCLE_STATUS,
  type AssetLifecycleStatus,
} from '@/shared/assets/asset-lifecycle.types'

export function canArchive(status: AssetLifecycleStatus): boolean {
  return status === ASSET_LIFECYCLE_STATUS.ACTIVE
}

export function canUnarchive(status: AssetLifecycleStatus): boolean {
  return status === ASSET_LIFECYCLE_STATUS.ARCHIVED
}

export function canMoveToTrash(status: AssetLifecycleStatus): boolean {
  return (
    status === ASSET_LIFECYCLE_STATUS.ACTIVE ||
    status === ASSET_LIFECYCLE_STATUS.ARCHIVED
  )
}

export function canRestoreFromTrash(status: AssetLifecycleStatus): boolean {
  return status === ASSET_LIFECYCLE_STATUS.TRASHED
}

export function canPurge(status: AssetLifecycleStatus): boolean {
  return status === ASSET_LIFECYCLE_STATUS.TRASHED
}
