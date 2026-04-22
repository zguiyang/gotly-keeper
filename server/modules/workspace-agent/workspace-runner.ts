import 'server-only'

import { composeWorkspaceAnswer } from './workspace-compose'
import { executeWorkspaceTool } from './workspace-tools'
import { parseWorkspaceTask } from './workspace-task-parser'
import { WorkspaceTaskRoutingError, routeWorkspaceTask } from './workspace-task-router'

import type { WorkspaceRunEvent, WorkspaceRunResult, WorkspaceTask, WorkspaceToolResult } from './types'

type RunWorkspaceInput = {
  message: string
  userId: string
  onEvent?: (event: WorkspaceRunEvent) => void
}

function emitEvent(
  onEvent: RunWorkspaceInput['onEvent'],
  event: WorkspaceRunEvent
) {
  onEvent?.(event)
}

export async function runWorkspace(input: RunWorkspaceInput): Promise<WorkspaceRunResult> {
  emitEvent(input.onEvent, {
    phase: 'parse',
    status: 'active',
    message: '正在理解请求',
  })

  let task: WorkspaceTask
  try {
    task = await parseWorkspaceTask({
      message: input.message,
      userId: input.userId,
    })
  } catch (error) {
    emitEvent(input.onEvent, {
      phase: 'parse',
      status: 'failed',
      message: '未能解析请求',
    })

    return {
      ok: false,
      phase: 'parse_failed',
      message: error instanceof Error ? error.message : 'Failed to parse workspace task.',
    }
  }

  emitEvent(input.onEvent, {
    phase: 'parse',
    status: 'done',
    message: '已理解请求',
  })
  emitEvent(input.onEvent, {
    phase: 'route',
    status: 'active',
    message: '正在选择操作',
  })

  let plan
  try {
    plan = routeWorkspaceTask(task)
  } catch (error) {
    emitEvent(input.onEvent, {
      phase: 'route',
      status: 'failed',
      message: '当前不支持此类操作',
    })

    return {
      ok: false,
      phase: 'unsupported_task',
      message:
        error instanceof WorkspaceTaskRoutingError
          ? error.message
          : 'Unsupported workspace task.',
      task,
    }
  }

  emitEvent(input.onEvent, {
    phase: 'route',
    status: 'done',
    message: `已选择 ${plan.toolName}`,
  })
  emitEvent(input.onEvent, {
    phase: 'execute',
    status: 'active',
    message: '正在执行工具',
  })

  let data: WorkspaceToolResult
  try {
    data = await executeWorkspaceTool(
      {
        toolName: plan.toolName as keyof typeof import('./workspace-tools').workspaceTools,
        toolInput: plan.toolInput,
      },
      { userId: input.userId }
    )
  } catch (error) {
    emitEvent(input.onEvent, {
      phase: 'execute',
      status: 'failed',
      message: '工具执行失败',
    })

    return {
      ok: false,
      phase: 'tool_failed',
      message: error instanceof Error ? error.message : 'Workspace tool execution failed.',
      task,
      plan,
    }
  }

  if (!data.ok) {
    emitEvent(input.onEvent, {
      phase: 'execute',
      status: 'failed',
      message: data.message,
    })

    return {
      ok: false,
      phase: 'tool_failed',
      message: data.message,
      task,
      plan,
      data,
    }
  }

  emitEvent(input.onEvent, {
    phase: 'execute',
    status: 'done',
    message: '工具执行完成',
  })

  emitEvent(input.onEvent, {
    phase: 'compose',
    status: 'active',
    message: '正在整理结果',
  })

  const composed = await composeWorkspaceAnswer({
    task,
    plan,
    data,
  })

  emitEvent(input.onEvent, {
    phase: 'compose',
    status: 'done',
    message: composed.usedFallback ? '已整理结果（使用回退文案）' : '结果已整理完成',
  })

  return {
    ok: true,
    phase: 'completed',
    task,
    plan,
    data,
    answer: composed.answer,
  }
}
