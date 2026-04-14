import 'server-only'

import { createAlibaba } from '@ai-sdk/alibaba'

import { serverEnv } from '@/server/env'

export function getAssetInputLanguageModel() {
  const { apiKey, url, modelName } = serverEnv.aiGateway

  if (!apiKey || !url || !modelName) {
    return null
  }

  return createAlibaba({
    apiKey,
    baseURL: url,
  })(modelName)
}
