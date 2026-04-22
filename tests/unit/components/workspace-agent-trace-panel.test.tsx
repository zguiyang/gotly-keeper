import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { WorkspaceRunPanel } from '@/components/workspace/workspace-run-panel'

describe('WorkspaceRunPanel', () => {
  it('renders safe runner phases as a timeline', () => {
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

    expect(html).toContain('AI 工作链')
    expect(html).toContain('理解请求')
    expect(html).toContain('已理解请求')
    expect(html).toContain('执行工具')
    expect(html).toContain('正在执行工具')
    expect(html).not.toMatch(/system prompt/i)
  })
})
