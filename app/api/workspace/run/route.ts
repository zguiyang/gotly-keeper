
import { requireWorkspaceUserAccess } from '@/server/modules/auth/workspace-session'
import {
  QUICK_ACTION_PROMPTS,
  streamWorkspaceRun,
} from '@/server/modules/workspace/workspace-stream'

import type { WorkspaceRunRequest } from '@/shared/workspace/workspace-run.types'

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

  if (body.kind === 'input' && body.text.trim().length === 0) {
    return Response.json({ error: '请输入有效内容。' }, { status: 400 })
  }

  const result = streamWorkspaceRun({
    userId: user.id,
    request: body,
  })

  return result
}
