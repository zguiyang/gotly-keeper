import { beforeEach, describe, expect, it, vi } from 'vitest'

import * as aiExports from '@/server/lib/ai'
import { parseWorkspaceCommand } from '@/server/lib/ai/workspace-parser'

const {
  runAiGenerationMock,
  buildAssetInterpreterPromptMock,
  buildParsedCommandSystemPromptMock,
} = vi.hoisted(() => ({
  runAiGenerationMock: vi.fn(),
  buildAssetInterpreterPromptMock: vi.fn(),
  buildParsedCommandSystemPromptMock: vi.fn(),
}))

vi.mock('@/server/lib/ai/ai-runner', () => ({
  runAiGeneration: runAiGenerationMock,
}))

vi.mock('@/server/lib/ai/ai.prompts', () => ({
  buildAssetInterpreterPrompt: buildAssetInterpreterPromptMock,
  buildParsedCommandSystemPrompt: buildParsedCommandSystemPromptMock,
}))

describe('workspace-parser', () => {
  beforeEach(() => {
    runAiGenerationMock.mockReset()
    buildAssetInterpreterPromptMock.mockReset()
    buildParsedCommandSystemPromptMock.mockReset()
    buildAssetInterpreterPromptMock.mockResolvedValue('mock-user-prompt')
    buildParsedCommandSystemPromptMock.mockResolvedValue('mock-system-prompt')
  })

  it('normalizes originalText and rawInput from the trimmed input', async () => {
    runAiGenerationMock.mockResolvedValue({
      success: true,
      data: {
        confidence: 0.92,
        originalText: '模型回填的旧值',
        rawInput: '模型回填的旧值',
        intent: 'create',
        operation: 'create_link',
        assetType: 'link',
        todo: null,
        note: null,
        bookmark: {
          url: 'https://example.com',
          title: null,
          note: null,
          summary: null,
        },
        search: null,
        summary: null,
      },
    })

    const result = await parseWorkspaceCommand('  存一下这个链接 https://example.com  ')

    expect(buildAssetInterpreterPromptMock).toHaveBeenCalledWith('存一下这个链接 https://example.com')
    expect(buildParsedCommandSystemPromptMock).toHaveBeenCalledTimes(1)
    expect(runAiGenerationMock).toHaveBeenCalledTimes(1)
    expect(runAiGenerationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        systemPrompt: 'mock-system-prompt',
        userPrompt: 'mock-user-prompt',
      })
    )
    expect(result.originalText).toBe('存一下这个链接 https://example.com')
    expect(result.rawInput).toBe('存一下这个链接 https://example.com')
    expect(result.operation).toBe('create_link')
    expect(result.bookmark?.url).toBe('https://example.com')
  })

  it('falls back to rule-based search when AI confidence is too low', async () => {
    runAiGenerationMock.mockResolvedValue({
      success: true,
      data: {
        confidence: 0.32,
        originalText: '帮我找上周收藏的文章',
        rawInput: '帮我找上周收藏的文章',
        intent: 'create',
        operation: 'create_note',
        assetType: 'note',
        todo: null,
        note: {
          title: null,
          content: '帮我找上周收藏的文章',
          summary: null,
        },
        bookmark: null,
        search: null,
        summary: null,
      },
    })

    const result = await parseWorkspaceCommand('帮我找上周收藏的文章')

    expect(result.confidence).toBe(0.32)
    expect(result.intent).toBe('search')
    expect(result.operation).toBe('search_assets')
    expect(result.assetType).toBeNull()
    expect(result.search).toEqual({
      query: '帮我找上周收藏的文章',
      typeHint: 'link',
      timeHint: '上周',
      completionHint: null,
    })
    expect(result.rawInput).toBe('帮我找上周收藏的文章')
  })

  it('falls back to bounded summary parsing when AI generation fails', async () => {
    runAiGenerationMock.mockResolvedValue({
      success: false,
      error: new Error('provider failed'),
    })

    const result = await parseWorkspaceCommand('总结一下最近收藏')

    expect(result.confidence).toBe(0)
    expect(result.intent).toBe('summarize')
    expect(result.operation).toBe('summarize_workspace')
    expect(result.summary).toEqual({
      target: 'bookmarks',
      query: '总结一下最近收藏',
    })
    expect(result.originalText).toBe('总结一下最近收藏')
    expect(result.rawInput).toBe('总结一下最近收藏')
  })

  it('does not expose workspace parser from the ai barrel export', () => {
    expect('parseWorkspaceCommand' in aiExports).toBe(false)
  })
})
