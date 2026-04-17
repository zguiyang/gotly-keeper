export const ASSET_LIFECYCLE_STATUS = {
  ACTIVE: 'active',
  ARCHIVED: 'archived',
  TRASHED: 'trashed',
} as const

export type AssetLifecycleStatus =
  (typeof ASSET_LIFECYCLE_STATUS)[keyof typeof ASSET_LIFECYCLE_STATUS]

export const ASSET_LIFECYCLE_STATUSES: AssetLifecycleStatus[] = [
  ASSET_LIFECYCLE_STATUS.ACTIVE,
  ASSET_LIFECYCLE_STATUS.ARCHIVED,
  ASSET_LIFECYCLE_STATUS.TRASHED,
]
