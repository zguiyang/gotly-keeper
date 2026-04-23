import { requireWorkspaceUserAccess } from '@/server/modules/auth/workspace-session'
import { runWorkspace } from '@/server/modules/workspace-agent/workspace-runner'

import type { AssetListItem } from '@/shared/assets/assets.types'
import type { WorkspaceRunApiResponse, WorkspaceRunRequest } from '@/shared/workspace/workspace-runner.types'

const QUICK_ACTION_PROMPTS = {
  'review-todos': '总结最近待办重点',
  'summarize-notes': '总结最近笔记重点',
  'summarize-bookmarks': '总结最近收藏的书签重点',
} as const

function isWorkspaceRunRequest(body: unknown): body is WorkspaceRunRequest {
  if (!body || typeof body !== 'object') {
    return false
  }

  if ('kind' in body && body.kind === 'input') {
    return 'text' in body && typeof body.text === 'string'
  }

  if ('kind' in body && body.kind === 'quick-action') {
    return (
      'action' in body &&
      typeof body.action === 'string' &&
      Object.hasOwn(QUICK_ACTION_PROMPTS, body.action)
    )
  }

  return false
}

function normalizeRequestToMessage(request: WorkspaceRunRequest) {
  if (request.kind === 'input') {
    return request.text
  }

  return QUICK_ACTION_PROMPTS[request.action]
}

function isAssetListItemArray(value: unknown): value is AssetListItem[] {
  return Array.isArray(value)
}

function isAssetListItem(value: unknown): value is AssetListItem {
  return !!value && typeof value === 'object' && 'id' in value && 'type' in value
}

export async function POST(req: Request) {
  const user = await requireWorkspaceUserAccess()

  let body: unknown

  try {
    body = await req.json()
  } catch {
    return Response.json({ error: '请求体格式不正确。' }, { status: 400 })
  }

  if (!isWorkspaceRunRequest(body)) {
    return Response.json({ error: '请求参数无效。' }, { status: 400 })
  }

  const message = normalizeRequestToMessage(body).trim()
  if (!message) {
    return Response.json({ error: '请输入有效内容。' }, { status: 400 })
  }

  const phases: WorkspaceRunApiResponse['phases'] = []
  const result = await runWorkspace({
    message,
    userId: user.id,
    onEvent: (event) => {
      phases.push(event)
    },
  })

  if (!result.ok) {
    const response: WorkspaceRunApiResponse = {
      ok: false,
      phases,
      answer: null,
      data: {
        kind: 'error',
        phase: result.phase,
        message: result.message,
      },
    }

    return Response.json(response)
  }

  const data = result.data
  const response: WorkspaceRunApiResponse = {
    ok: true,
    phases,
    answer: result.answer,
    data:
      data.ok && Array.isArray(data.items) && typeof data.total === 'number'
        ? {
            kind: 'query',
            target: data.target,
            items: isAssetListItemArray(data.items) ? data.items : [],
            total: data.total,
          }
        : data.ok && data.action
          ? {
              kind: 'mutation',
              action: data.action,
              target:
                data.target === 'mixed'
                  ? 'notes'
                  : data.target,
              item: isAssetListItem(data.item) ? data.item : null,
            }
          : {
              kind: 'error',
              phase: 'tool_failed',
              message: '工具结果格式不正确。',
            },
  }

  return Response.json(response)
}
