import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { WorkspaceRunPanel } from '@/components/workspace/workspace-run-panel'

describe('WorkspaceRunPanel', () => {
  it('renders only the current thinking step while streaming', () => {
    const html = renderToStaticMarkup(
      <WorkspaceRunPanel
        status="streaming"
        assistantText="我正在查找你的笔记。"
        phases={[
          {
            phase: 'parse',
            status: 'done',
            message: '已理解请求',
          },
          {
            phase: 'execute',
            status: 'active',
            message: '正在执行工具',
          },
        ]}
      />
    )

    expect(html).toContain('正在调用工具')
    expect(html).toContain('正在执行工具')
    expect(html).not.toContain('已理解请求')
    expect(html).not.toMatch(/system prompt/i)
  })

  it('renders an actionable error state', () => {
    const html = renderToStaticMarkup(
      <WorkspaceRunPanel
        status="error"
        assistantText={null}
        phases={[
          {
            phase: 'parse',
            status: 'failed',
            message: '未能解析请求',
          },
        ]}
        result={{
          kind: 'error',
          phase: 'parse_failed',
          message: '没有理解这次请求。',
        }}
      />
    )

    expect(html).toContain('这次没有完成处理')
    expect(html).toContain('没有理解这次请求。')
    expect(html).toContain('可以换成更明确的说法')
  })
})
