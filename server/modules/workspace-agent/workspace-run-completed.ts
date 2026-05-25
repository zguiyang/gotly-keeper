import type { WorkspaceRunExecutorResult } from './workspace-run-executor'
import type { WorkspacePlanPreview, WorkspaceRunPreview, WorkspaceRunResult } from '@/shared/workspace/workspace-run-protocol'

const ACTION_LABELS: Record<string, { en: string; 'zh-CN': string }> = {
  create_todo_with_title: {
    en: 'Added todo "{title}"',
    'zh-CN': '添加待办"{title}"',
  },
  create_todo: { en: 'Added todo', 'zh-CN': '添加待办' },
  create_note_with_title: {
    en: 'Saved note "{title}"',
    'zh-CN': '保存笔记"{title}"',
  },
  create_note: { en: 'Saved note', 'zh-CN': '保存笔记' },
  create_bookmark_with_title: {
    en: 'Bookmarked {title}',
    'zh-CN': '收藏链接 {title}',
  },
  create_bookmark: { en: 'Bookmarked', 'zh-CN': '收藏书签' },
  update_todo_with_title: {
    en: 'Updated todo "{title}"',
    'zh-CN': '更新待办"{title}"',
  },
  update_todo: { en: 'Updated todo', 'zh-CN': '更新待办' },
  query_found: {
    en: 'Found {count} results',
    'zh-CN': '找到 {count} 条内容',
  },
  summarize_found: {
    en: 'Summarized {count} results',
    'zh-CN': '整理了 {count} 条内容',
  },
  batch_prefix: {
    en: 'Executed {count} tasks: ',
    'zh-CN': '已执行 {count} 个任务：',
  },
  batch_separator: {
    en: ', ',
    'zh-CN': '、',
  },
  batch_suffix: {
    en: '.',
    'zh-CN': '。',
  },
}

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
  locale?: string
}) {
  const { toolName, result, locale = 'zh-CN' } = input
  const itemTitle = getItemTitle(result)

  const t = (key: string, vars?: Record<string, string>) => {
    const label = ACTION_LABELS[key]
    if (!label) return key
    const text = label[locale as keyof typeof label] ?? label.en
    if (!vars) return text
    return Object.entries(vars).reduce((acc, [k, v]) => acc.replace(`{${k}}`, v), text)
  }

  if (toolName === 'create_todo') {
    return itemTitle ? t('create_todo_with_title', { title: itemTitle }) : t('create_todo')
  }

  if (toolName === 'create_note') {
    return itemTitle ? t('create_note_with_title', { title: itemTitle }) : t('create_note')
  }

  if (toolName === 'create_bookmark') {
    return itemTitle ? t('create_bookmark_with_title', { title: itemTitle }) : t('create_bookmark')
  }

  if (toolName === 'update_todo') {
    return itemTitle ? t('update_todo_with_title', { title: itemTitle }) : t('update_todo')
  }

  if (toolName === 'query_assets') {
    return t('query_found', { count: String(getResultCount(result)) })
  }

  if (toolName === 'summarize_assets') {
    return t('summarize_found', { count: String(getResultCount(result)) })
  }

  return toolName
}

export function buildBatchAnswer(input: {
  plan: WorkspacePlanPreview | null | undefined
  executeResult: WorkspaceRunExecutorResult
  locale?: string
}) {
  const locale = input.locale ?? 'zh-CN'
  const t = (key: string, vars?: Record<string, string>) => {
    const label = ACTION_LABELS[key]
    if (!label) return key
    const text = label[locale as keyof typeof label] ?? label.en
    if (!vars) return text
    return Object.entries(vars).reduce((acc, [k, v]) => acc.replace(`{${k}}`, v), text)
  }

  const actionTexts = input.executeResult.stepResults.map((stepResult, index) => {
    const plannedToolName = input.plan?.steps[index]?.toolName

    return getActionText({
      toolName: plannedToolName ?? stepResult.toolName,
      result: stepResult.result,
      locale,
    })
  })

  const prefix = t('batch_prefix', { count: String(input.executeResult.stepResults.length) })
  const separator = t('batch_separator')
  const suffix = t('batch_suffix')
  return `${prefix}${actionTexts.join(separator)}${suffix}`
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
