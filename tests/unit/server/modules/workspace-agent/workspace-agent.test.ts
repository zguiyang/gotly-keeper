import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createWorkspaceAgent } from '@/server/modules/workspace-agent/workspace-agent'

const constructedAgents = vi.hoisted(() => [] as unknown[])
const toolLoopAgentMock = vi.hoisted(() =>
  vi.fn(
    class {
      settings: unknown

      constructor(settings: unknown) {
        this.settings = settings
        constructedAgents.push(this)
      }
    }
  )
)
const stepCountIsMock = vi.hoisted(() => vi.fn((count: number) => ({ kind: 'stepCountIs', count })))
const getAiProviderMock = vi.hoisted(() => vi.fn())
const buildWorkspaceSystemPromptMock = vi.hoisted(() => vi.fn())
const createWorkspaceAgentToolsMock = vi.hoisted(() => vi.fn())

vi.mock('ai', () => ({
  ToolLoopAgent: toolLoopAgentMock,
  stepCountIs: stepCountIsMock,
}))

vi.mock('@/server/lib/ai/ai-provider', () => ({
  getAiProvider: getAiProviderMock,
}))

vi.mock('@/server/lib/ai/ai.prompts', () => ({
  buildWorkspaceSystemPrompt: buildWorkspaceSystemPromptMock,
}))

vi.mock('@/server/modules/workspace-agent/workspace-agent-tools', () => ({
  createWorkspaceAgentTools: createWorkspaceAgentToolsMock,
}))

describe('createWorkspaceAgent', () => {
  beforeEach(() => {
    toolLoopAgentMock.mockReset()
    constructedAgents.length = 0
    stepCountIsMock.mockClear()
    getAiProviderMock.mockReset()
    buildWorkspaceSystemPromptMock.mockReset()
    createWorkspaceAgentToolsMock.mockReset()
  })

  it('configures a tool loop with room for one repair step', async () => {
    const model = { modelId: 'test-model' }
    const tools = { search_workspace: {} }

    getAiProviderMock.mockReturnValue(model)
    buildWorkspaceSystemPromptMock.mockResolvedValue('system prompt')
    createWorkspaceAgentToolsMock.mockReturnValue(tools)

    const agent = await createWorkspaceAgent({ userId: 'user_1' })

    expect(agent).toBe(constructedAgents[0])
    expect(stepCountIsMock).toHaveBeenCalledWith(3)
    expect(toolLoopAgentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model,
        instructions: 'system prompt',
        tools,
        stopWhen: { kind: 'stepCountIs', count: 3 },
        temperature: 0,
        maxRetries: 1,
      })
    )
  })
})
