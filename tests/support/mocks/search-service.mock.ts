import type { AssetListItem } from '@/shared/assets/assets.types'
import type { SearchAssetsOptions } from '@/server/services/search/search.types'

export interface SearchServiceMockOptions {
  shouldSucceed?: boolean
  results?: AssetListItem[]
  errorMessage?: string
}

export function createSearchServiceMock(options: SearchServiceMockOptions = {}) {
  const { shouldSucceed = true, results = [], errorMessage = 'Search mock error' } = options

  return {
    searchAssets: async function mockSearchAssets(
      opts: SearchAssetsOptions
    ): Promise<AssetListItem[]> {
      if (!shouldSucceed) {
        throw new Error(errorMessage)
      }
      return results
    },
  }
}

export const searchServiceMocks = {
  empty: () => createSearchServiceMock({ results: [] }),
  withResults: (results: AssetListItem[]) => createSearchServiceMock({ results }),
  failure: (errorMessage?: string) => createSearchServiceMock({ shouldSucceed: false, errorMessage }),
}
