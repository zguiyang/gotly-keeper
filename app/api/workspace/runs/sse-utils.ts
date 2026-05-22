import type { WorkspaceRunStreamEvent } from '@/shared/workspace/workspace-run-protocol'

/**
 * Encode a WorkspaceRunStreamEvent as an SSE text frame.
 */
export function encodeSseEvent(event: WorkspaceRunStreamEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`
}

/**
 * SSE response headers for a text/event-stream.
 */
export const SSE_RESPONSE_HEADERS: Record<string, string> = {
  'cache-control': 'no-cache, no-transform',
  connection: 'keep-alive',
  'content-type': 'text/event-stream; charset=utf-8',
  'x-accel-buffering': 'no',
}
