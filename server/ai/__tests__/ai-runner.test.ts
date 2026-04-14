import { describe, it, expect, vi, beforeEach, afterEach } from 'node:test'
import { z } from 'zod'

vi.mock('@/server/ai/ai-provider', () => ({
  getAiProvider: vi.fn(),
}))

const mockGenerateText = vi.hoisted(() => vi.fn())
vi.mock('ai', () => ({
  generateText: mockGenerateText,
  Output: { object: mockGenerateText },
}))

describe('ai-runner', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('runAiGeneration', () => {
    it('should return success when AI call succeeds', async () => {
      const { getAiProvider } = await import('@/server/ai/ai-provider')
      const mockModel = {}
      ;(getAiProvider as ReturnType<typeof vi.fn>).mockReturnValue(mockModel)

      mockGenerateText.mockResolvedValue({
        output: { result: 'success' },
      })

      const { runAiGeneration } = await import('@/server/ai/ai-runner')
      const schema = z.object({ result: z.string() })

      const result = await runAiGeneration({
        schema,
        systemPrompt: 'Test prompt',
        userPrompt: 'Test input',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.result).toBe('success')
      }
    })

    it('should return error when AI provider is not configured', async () => {
      const { getAiProvider } = await import('@/server/ai/ai-provider')
      ;(getAiProvider as ReturnType<typeof vi.fn>).mockReturnValue(null)

      const { runAiGeneration } = await import('@/server/ai/ai-runner')
      const schema = z.object({ result: z.string() })

      const result = await runAiGeneration({
        schema,
        systemPrompt: 'Test prompt',
        userPrompt: 'Test input',
      })

      expect(result.success).toBe(false)
    })
  })
})
