import 'server-only'

import { ToolLoopAgent, stepCountIs } from 'ai'

import { getAiProvider } from '@/server/lib/ai/ai-provider'
import { buildWorkspaceSystemPrompt } from '@/server/lib/ai/ai.prompts'

import { createWorkspaceAgentTools } from './workspace-agent-tools'

export async function createWorkspaceAgent({ userId }: { userId: string }) {
  const model = getAiProvider()

  if (!model) {
    return null
  }

  const instructions = await buildWorkspaceSystemPrompt('workspace-agent/main.system', {
    currentTimestamp: new Date().toISOString(),
    timezone: 'Asia/Shanghai',
  })

  return new ToolLoopAgent({
    model,
    instructions,
    tools: createWorkspaceAgentTools({ userId }),
    stopWhen: stepCountIs(2),
    temperature: 0,
    maxRetries: 1,
    providerOptions: {
      alibaba: {
        enableThinking: false,
      },
    },
  })
}
