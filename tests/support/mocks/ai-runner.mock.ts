import { AiProviderError, type AiResult } from '@/server/lib/ai/ai.types'

export interface AiRunnerMockOptions<T> {
  shouldSucceed?: boolean
  resultData?: T
  errorMessage?: string
}

export function createAiRunnerMock<T>(options: AiRunnerMockOptions<T> = {}) {
  const { shouldSucceed = true, resultData, errorMessage = 'AI mock error' } = options

  return {
    runAiGeneration: async function mockRunAiGeneration<T>(): Promise<AiResult<T>> {
      if (!shouldSucceed) {
        return {
          success: false,
          error: new AiProviderError(errorMessage, null),
        }
      }
      return {
        success: true,
        data: (resultData ?? ({} as NonNullable<T>)) as T,
      }
    },

    interpretAssetInputWithAi: async function mockInterpretAssetInputWithAi(
      trimmed: string
    ): Promise<{ success: true; data: unknown } | { success: false; fallback: true }> {
      if (!shouldSucceed) {
        return { success: false, fallback: true }
      }
      return {
        success: true,
        data: resultData ?? { type: 'note', originalText: trimmed },
      }
    },

    summarizeWithAi: async function mockSummarizeWithAi<T>(): Promise<
      { success: true; data: T } | { success: false; fallback: true }
    > {
      if (!shouldSucceed) {
        return { success: false, fallback: true }
      }
      return {
        success: true,
        data: (resultData ?? ({} as NonNullable<T>)) as T,
      }
    },
  }
}

export const aiRunnerMocks = {
  success: <T>(data?: T) => createAiRunnerMock<T>({ shouldSucceed: true, resultData: data }),
  failure: <T>(errorMessage?: string) => createAiRunnerMock<T>({ shouldSucceed: false, errorMessage }),
  noProvider: <T>() =>
    createAiRunnerMock<T>({
      shouldSucceed: false,
      errorMessage: 'AI provider not configured',
    }),
}
