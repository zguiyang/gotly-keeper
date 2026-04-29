import type { WorkspaceRunExecutorResult } from './workspace-run-executor'
import type { WorkspacePlanPreview, WorkspaceRunPreview, WorkspaceRunResult } from '@/shared/workspace/workspace-run-protocol'

function getResultCount(result: WorkspaceRunExecutorResult['stepResults'][number]['result']) {
  if (!result.ok) {
    return 0
  }

  if (typeof result.total === 'number') {
    return result.total
  }

  if (Array.isArray(result.items)) {
    return result.items.length
  }

  return 0
}

function getItemTitle(result: WorkspaceRunExecutorResult['stepResults'][number]['result']) {
  if (!result.ok || !result.item || typeof result.item !== 'object') {
    return null
  }

  const item = result.item as { title?: unknown; url?: unknown }
  if (typeof item.title === 'string' && item.title.trim()) {
    return item.title.trim()
  }

  if (typeof item.url === 'string' && item.url.trim()) {
    return item.url.trim()
  }

  return null
}

function getActionText(input: {
  toolName: string
  result: WorkspaceRunExecutorResult['stepResults'][number]['result']
}) {
  const { toolName, result } = input
  const itemTitle = getItemTitle(result)

  if (toolName === 'create_todo') {
    return itemTitle ? `添加待办“${itemTitle}”` : '添加待办'
  }

  if (toolName === 'create_note') {
    return itemTitle ? `保存笔记“${itemTitle}”` : '保存笔记'
  }

  if (toolName === 'create_bookmark') {
    return itemTitle ? `收藏链接 ${itemTitle}` : '收藏书签'
  }

  if (toolName === 'update_todo') {
    return itemTitle ? `更新待办“${itemTitle}”` : '更新待办'
  }

  if (toolName === 'query_assets') {
    return `找到 ${getResultCount(result)} 条内容`
  }

  if (toolName === 'summarize_assets') {
    return `整理了 ${getResultCount(result)} 条内容`
  }

  return toolName
}

export function buildBatchAnswer(input: {
  plan: WorkspacePlanPreview | null | undefined
  executeResult: WorkspaceRunExecutorResult
}) {
  const actionTexts = input.executeResult.stepResults.map((stepResult, index) => {
    const plannedToolName = input.plan?.steps[index]?.toolName

    return getActionText({
      toolName: plannedToolName ?? stepResult.toolName,
      result: stepResult.result,
    })
  })

  return `已执行 ${input.executeResult.stepResults.length} 个任务：${actionTexts.join('、')}。`
}

export function buildCompletedRunResult(input: {
  executeResult: WorkspaceRunExecutorResult
  preview?: WorkspaceRunPreview | null
  answer: string
  data?: WorkspaceRunResult['data']
}) {
  return {
    summary: input.executeResult.summary,
    answer: input.answer,
    preview: input.preview ?? undefined,
    data: input.data,
    stepResults: input.executeResult.stepResults,
  } satisfies WorkspaceRunResult
}
