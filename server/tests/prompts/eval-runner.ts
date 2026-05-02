import 'server-only'

import { generateText, Output } from 'ai'

import {
  getAiProvider,
} from '@/server/lib/ai/ai-provider'
import {
  buildWorkspaceSystemPrompt,
} from '@/server/lib/ai/ai.prompts'
import { renderPrompt } from '@/server/lib/prompt-template'

import type { ZodType } from 'zod'

export type EvalCase<TInput, TExpected> = {
  id: string
  tags?: string[]
  input: TInput
  expected: TExpected
}

export type EvalResult = {
  caseId: string
  passed: boolean
  score: number
  actual: unknown
  expected: unknown
  errors: string[]
}

export type EvalConfig<TOutput> = {
  name: string
  promptKey: string
  outputSchema: ZodType<TOutput>
  buildVars: (tc: EvalCase<unknown, unknown>) => Record<string, unknown>
  scorer: (actual: TOutput, expected: unknown) => number
  threshold: number
}

export async function runEval<TOutput>(
  config: EvalConfig<TOutput>,
  cases: EvalCase<unknown, unknown>[]
): Promise<{ summary: string; results: EvalResult[] }> {
  const model = getAiProvider()
  if (!model) {
    throw new Error('AI provider not configured — cannot run eval')
  }

  const results: EvalResult[] = []

  for (const tc of cases) {
    try {
      const [systemPrompt, userPrompt] = await Promise.all([
        buildWorkspaceSystemPrompt(`${config.promptKey}/system`, {}),
        renderPrompt(`${config.promptKey}/user`, config.buildVars(tc)),
      ])

      const result = await generateText({
        model,
        output: Output.object({ schema: config.outputSchema }),
        system: systemPrompt,
        prompt: userPrompt,
        temperature: 0,
        providerOptions: {
          alibaba: { enableThinking: true },
        },
      })

      const score = config.scorer(result.output, tc.expected)

      results.push({
        caseId: tc.id,
        passed: score >= config.threshold,
        score,
        actual: result.output,
        expected: tc.expected,
        errors: [],
      })
    } catch (error) {
      results.push({
        caseId: tc.id,
        passed: false,
        score: 0,
        actual: null,
        expected: tc.expected,
        errors: [error instanceof Error ? error.message : String(error)],
      })
    }
  }

  const passedCount = results.filter((r) => r.passed).length
  const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length

  return {
    summary: `[${config.name}] ${passedCount}/${results.length} passed | avg score ${avgScore.toFixed(2)}`,
    results,
  }
}
