import 'server-only'

import { generateText, Output } from 'ai'

import { buildWorkspaceSystemPrompt, getAiProvider } from '@/server/lib/ai'
import { AI_MAX_RETRIES, AI_TEMPERATURE } from '@/server/lib/config/ai'
import { renderPrompt } from '@/server/lib/prompt-template'
import { nowIso, dayjs } from '@/shared/time/dayjs'

import type { AssetListItem } from '@/shared/assets/assets.types'
import type { ZodType } from 'zod'

type WorkspaceInsightBaseOutput = {
  headline: string
  summary: string
  sourceAssetIds: string[]
}

type BuildPromptInputOptions<TPromptItem> = {
  assets: AssetListItem[]
  limit: number
  mapAsset: (asset: AssetListItem) => TPromptItem
}

type WorkspaceInsightContext = {
  sourceAssetIds: string[]
  sources: AssetListItem[]
  generatedAt: Date
}

type GenerateWorkspaceInsightOptions<TPromptItem, TOutput extends WorkspaceInsightBaseOutput, TResult> = {
  assets: AssetListItem[]
  buildPromptInput: (assets: AssetListItem[]) => TPromptItem[]
  fallbackOutput: (assets: AssetListItem[]) => TOutput
  schema: ZodType<TOutput>
  promptKey: string
  promptPayloadKey: string
  timeoutMs: number
  logTag: string
  logLabel: string
  normalizeResult: (output: TOutput, context: WorkspaceInsightContext) => TResult
}

export function buildWorkspaceAssetPromptInput<TPromptItem>({
  assets,
  limit,
  mapAsset,
}: BuildPromptInputOptions<TPromptItem>): TPromptItem[] {
  return assets.slice(0, limit).map(mapAsset)
}

export function buildWorkspaceInsightContext(
  output: WorkspaceInsightBaseOutput,
  assets: AssetListItem[]
): WorkspaceInsightContext {
  const validIds = new Set(assets.map((asset) => asset.id))
  const filteredSourceIds = output.sourceAssetIds.filter((id) => validIds.has(id))
  const fallbackIds = assets.slice(0, 5).map((asset) => asset.id)
  const sourceAssetIds = filteredSourceIds.length ? filteredSourceIds : fallbackIds
  const requested = new Set(sourceAssetIds)

  return {
    sourceAssetIds,
    sources: assets.filter((asset) => requested.has(asset.id)),
    generatedAt: dayjs().toDate(),
  }
}

export async function generateWorkspaceInsight<
  TPromptItem,
  TOutput extends WorkspaceInsightBaseOutput,
  TResult,
>({
  assets,
  buildPromptInput,
  fallbackOutput,
  schema,
  promptKey,
  promptPayloadKey,
  timeoutMs,
  logTag,
  logLabel,
  normalizeResult,
}: GenerateWorkspaceInsightOptions<TPromptItem, TOutput, TResult>): Promise<TResult> {
  const normalizeWithAssets = (output: TOutput) =>
    normalizeResult(output, buildWorkspaceInsightContext(output, assets))

  if (assets.length === 0) {
    return normalizeWithAssets(fallbackOutput(assets))
  }

  const model = getAiProvider()
  if (!model) {
    return normalizeWithAssets(fallbackOutput(assets))
  }

  try {
    const [systemPrompt, userPrompt] = await Promise.all([
      buildWorkspaceSystemPrompt(`${promptKey}.system`),
      renderPrompt(`${promptKey}.user`, {
        payloadJson: JSON.stringify({
          currentTime: nowIso(),
          [promptPayloadKey]: buildPromptInput(assets),
        }),
      }),
    ])

    const result = await generateText({
      model,
      output: Output.object({ schema }),
      system: systemPrompt,
      prompt: userPrompt,
      temperature: AI_TEMPERATURE,
      maxRetries: AI_MAX_RETRIES,
      timeout: timeoutMs,
      providerOptions: {
        alibaba: {
          enableThinking: false,
        },
      },
    })

    return normalizeWithAssets(result.output)
  } catch (error) {
    console.warn(`[${logTag}] AI ${logLabel} failed; using fallback`, {
      error: error instanceof Error ? error.message : String(error),
    })
    return normalizeWithAssets(fallbackOutput(assets))
  }
}
