import 'server-only'

import { runAiGeneration } from '@/server/lib/ai/ai-runner'
import { isAiTimeoutError } from '@/server/lib/ai/ai.errors'
import { buildWorkspaceSystemPrompt } from '@/server/lib/ai/ai.prompts'
import { WORKSPACE_TASK_PARSE_TIMEOUT_MS } from '@/server/lib/config/constants'
import { renderPrompt } from '@/server/lib/prompt-template'
import { ASIA_SHANGHAI_TIME_ZONE, dayjs } from '@/shared/time/dayjs'

import { validateWorkspaceTask, workspaceTaskOutputSchema } from './workspace-task'

import type { WorkspaceTask } from './types'

export class WorkspaceTaskParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'WorkspaceTaskParseError'
  }
}

function buildTimeContext(now: Date = new Date()) {
  const shanghaiTime = dayjs(now).tz(ASIA_SHANGHAI_TIME_ZONE)

  return {
    currentDateTime: shanghaiTime.format('YYYY-MM-DD HH:mm:ss'),
    currentIsoUtc: shanghaiTime.toDate().toISOString(),
    timezone: ASIA_SHANGHAI_TIME_ZONE,
    utcOffset: shanghaiTime.format('Z'),
    weekday: shanghaiTime.format('dddd'),
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
      timeContextJson: JSON.stringify(buildTimeContext()),
    }),
  ])

  const result = await runAiGeneration({
    schema: workspaceTaskOutputSchema,
    systemPrompt,
    userPrompt,
    timeoutMs: WORKSPACE_TASK_PARSE_TIMEOUT_MS,
  })

  if (!result.success) {
    const error = result.error
    const errorMessage = error instanceof Error ? error.message : String(error)

    if (isAiTimeoutError(error)) {
      throw new WorkspaceTaskParseError('处理超时了，请稍后重试。')
    }

    throw new WorkspaceTaskParseError(errorMessage)
  }

  return validateWorkspaceTask(result.data)
}
