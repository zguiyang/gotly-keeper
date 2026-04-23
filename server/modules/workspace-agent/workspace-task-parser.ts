import 'server-only'

import { runAiGeneration } from '@/server/lib/ai/ai-runner'
import { buildWorkspaceSystemPrompt } from '@/server/lib/ai/ai.prompts'
import { renderPrompt } from '@/server/lib/prompt-template'

import { validateWorkspaceTask, workspaceTaskOutputSchema } from './workspace-task'

import type { WorkspaceTask } from './types'

export class WorkspaceTaskParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'WorkspaceTaskParseError'
  }
}

export async function parseWorkspaceTask(input: {
  message: string
  userId: string
}): Promise<WorkspaceTask> {
  const trimmedMessage = input.message.trim()
  if (!trimmedMessage) {
    throw new WorkspaceTaskParseError('Workspace message cannot be empty.')
  }

  const [systemPrompt, userPrompt] = await Promise.all([
    buildWorkspaceSystemPrompt('workspace-agent/task-parse.system', {}),
    renderPrompt('workspace-agent/task-parse.user', {
      payloadJson: JSON.stringify({
        userId: input.userId,
        message: trimmedMessage,
      }),
    }),
  ])

  const result = await runAiGeneration({
    schema: workspaceTaskOutputSchema,
    systemPrompt,
    userPrompt,
  })

  if (!result.success) {
    throw new WorkspaceTaskParseError(result.error.message)
  }

  return validateWorkspaceTask(result.data)
}
