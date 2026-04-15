import 'server-only'

import { createAlibaba } from '@ai-sdk/alibaba'

import { serverEnv } from '@/server/lib/env'
import type { AiProvider } from './ai.types'

export function getAiProvider(): AiProvider {
  const { apiKey, url, modelName } = serverEnv.aiGateway

  if (!apiKey || !url || !modelName) {
    return null
  }

  return createAlibaba({
    apiKey,
    baseURL: url,
  })(modelName)
}
