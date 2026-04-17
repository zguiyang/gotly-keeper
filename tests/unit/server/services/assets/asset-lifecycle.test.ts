import { describe, expect, it } from 'vitest'

import {
  canArchive,
  canMoveToTrash,
  canPurge,
  canRestoreFromTrash,
  canUnarchive,
} from '@/server/services/assets/asset-lifecycle'
import { ASSET_LIFECYCLE_STATUS } from '@/shared/assets/asset-lifecycle.types'

describe('asset lifecycle transitions', () => {
  it('active can archive or move to trash', () => {
    expect(canArchive(ASSET_LIFECYCLE_STATUS.ACTIVE)).toBe(true)
    expect(canMoveToTrash(ASSET_LIFECYCLE_STATUS.ACTIVE)).toBe(true)
  })

  it('archived can unarchive or move to trash', () => {
    expect(canUnarchive(ASSET_LIFECYCLE_STATUS.ARCHIVED)).toBe(true)
    expect(canMoveToTrash(ASSET_LIFECYCLE_STATUS.ARCHIVED)).toBe(true)
  })

  it('trashed can restore or purge', () => {
    expect(canRestoreFromTrash(ASSET_LIFECYCLE_STATUS.TRASHED)).toBe(true)
    expect(canPurge(ASSET_LIFECYCLE_STATUS.TRASHED)).toBe(true)
  })

  it('purge only available in trashed', () => {
    expect(canPurge(ASSET_LIFECYCLE_STATUS.ACTIVE)).toBe(false)
    expect(canPurge(ASSET_LIFECYCLE_STATUS.ARCHIVED)).toBe(false)
  })
})
