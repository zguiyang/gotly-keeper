import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  streamTextMock,
  stepCountIsMock,
  requireWorkspaceUserAccessMock,
  getAiProviderMock,
  createWorkspaceToolsMock,
  buildWorkspaceToolRulesPromptMock,
  toUIMessageStreamResponseMock,
  streamResponse,
  stopCondition,
  toolsRegistry,
} = vi.hoisted(() => {
  const streamResponse = new Response('stream')

  return {
    streamTextMock: vi.fn(),
    stepCountIsMock: vi.fn(),
    requireWorkspaceUserAccessMock: vi.fn(),
    getAiProviderMock: vi.fn(),
    createWorkspaceToolsMock: vi.fn(),
    buildWorkspaceToolRulesPromptMock: vi.fn(),
    toUIMessageStreamResponseMock: vi.fn(),
    streamResponse,
    stopCondition: Symbol('stop-condition'),
    toolsRegistry: { create_note: { description: '保存笔记' } },
  }
})

vi.mock('ai', () => ({
  streamText: streamTextMock,
  stepCountIs: stepCountIsMock,
}))

vi.mock('@/server/modules/auth/workspace-session', () => ({
  requireWorkspaceUserAccess: requireWorkspaceUserAccessMock,
}))

vi.mock('@/server/lib/ai/ai-provider', () => ({
  getAiProvider: getAiProviderMock,
}))

vi.mock('@/server/modules/workspace/workspace-tools', () => ({
  createWorkspaceTools: createWorkspaceToolsMock,
}))

vi.mock('@/server/modules/workspace/workspace-tool-rules', () => ({
  buildWorkspaceToolRulesPrompt: buildWorkspaceToolRulesPromptMock,
}))

import { POST } from '@/app/api/workspace/run/route'

describe('/api/workspace/run POST', () => {
  beforeEach(() => {
    streamTextMock.mockReset()
    stepCountIsMock.mockReset()
    requireWorkspaceUserAccessMock.mockReset()
    getAiProviderMock.mockReset()
    createWorkspaceToolsMock.mockReset()
    buildWorkspaceToolRulesPromptMock.mockReset()
    toUIMessageStreamResponseMock.mockReset()

    stepCountIsMock.mockReturnValue(stopCondition)
    requireWorkspaceUserAccessMock.mockResolvedValue({ id: 'user_123' })
    getAiProviderMock.mockReturnValue({ provider: 'mock-model' })
    createWorkspaceToolsMock.mockReturnValue(toolsRegistry)
    buildWorkspaceToolRulesPromptMock.mockReturnValue('工具规则段落')
    toUIMessageStreamResponseMock.mockReturnValue(streamResponse)
    streamTextMock.mockReturnValue({
      toUIMessageStreamResponse: toUIMessageStreamResponseMock,
    })
  })

  it('rejects empty input payload', async () => {
    const req = new Request('http://localhost/api/workspace/run', {
      method: 'POST',
      body: JSON.stringify({ kind: 'input', text: '' }),
    })

    const res = await POST(req)

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({ error: '请输入有效内容。' })
    expect(streamTextMock).not.toHaveBeenCalled()
  })

  it('uses authenticated tool streaming for input requests', async () => {
    const req = new Request('http://localhost/api/workspace/run', {
      method: 'POST',
      body: JSON.stringify({ kind: 'input', text: '帮我记一下发布清单' }),
    })

    const res = await POST(req)

    expect(res).toBe(streamResponse)
    expect(requireWorkspaceUserAccessMock).toHaveBeenCalledTimes(1)
    expect(createWorkspaceToolsMock).toHaveBeenCalledWith('user_123')
    expect(stepCountIsMock).toHaveBeenCalledWith(2)
    expect(streamTextMock).toHaveBeenCalledWith({
      model: { provider: 'mock-model' },
      system: [
        '你是 Gotly 的 workspace 助手。',
        '你的职责是从有限工具中选择一个最合适的工具。',
        '如果用户是新增内容，优先选择 create_*。',
        '如果用户是查询历史内容，选择 search_assets。',
        '如果用户是要求总结，选择 summarize_workspace。',
        '不要捏造工具，不要同时调用多个工具。',
        '工具规则段落',
      ].join('\n\n'),
      prompt: '帮我记一下发布清单',
      tools: toolsRegistry,
      stopWhen: stopCondition,
      temperature: 0,
      providerOptions: {
        alibaba: {
          enableThinking: false,
        },
      },
    })
    expect(toUIMessageStreamResponseMock).toHaveBeenCalledTimes(1)

    const [{ messageMetadata }] = toUIMessageStreamResponseMock.mock.calls[0]
    expect(messageMetadata({ part: { type: 'start' } })).toEqual({ stage: 'understanding' })
    expect(messageMetadata({ part: { type: 'tool-call' } })).toEqual({ stage: 'executing' })
    expect(messageMetadata({ part: { type: 'tool-result' } })).toEqual({ stage: 'executing' })
    expect(messageMetadata({ part: { type: 'finish-step' } })).toEqual({ stage: 'finalizing' })
    expect(messageMetadata({ part: { type: 'finish' } })).toEqual({ stage: 'finalizing' })
  })

  it('maps quick actions to fixed prompts', async () => {
    const req = new Request('http://localhost/api/workspace/run', {
      method: 'POST',
      body: JSON.stringify({ kind: 'quick-action', action: 'summarize-notes' }),
    })

    await POST(req)

    expect(streamTextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: '请总结我最近的笔记，提炼关键信息和下一步行动。',
      })
    )
  })

  it('rejects invalid quick-action values', async () => {
    const req = new Request('http://localhost/api/workspace/run', {
      method: 'POST',
      body: JSON.stringify({ kind: 'quick-action', action: 'invalid-action' }),
    })

    const res = await POST(req)

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({ error: '请求参数无效。' })
    expect(streamTextMock).not.toHaveBeenCalled()
  })

  it('rejects quick-action values from prototype keys', async () => {
    const req = new Request('http://localhost/api/workspace/run', {
      method: 'POST',
      body: JSON.stringify({ kind: 'quick-action', action: 'toString' }),
    })

    const res = await POST(req)

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({ error: '请求参数无效。' })
    expect(streamTextMock).not.toHaveBeenCalled()
  })

  it('returns clear error when AI provider is unavailable', async () => {
    getAiProviderMock.mockReturnValue(null)

    const req = new Request('http://localhost/api/workspace/run', {
      method: 'POST',
      body: JSON.stringify({ kind: 'input', text: '总结一下最近内容' }),
    })

    const res = await POST(req)

    expect(res.status).toBe(503)
    await expect(res.json()).resolves.toEqual({ error: 'AI provider not configured' })
    expect(streamTextMock).not.toHaveBeenCalled()
  })
})
