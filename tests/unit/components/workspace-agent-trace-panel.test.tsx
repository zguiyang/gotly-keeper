import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { WorkspaceRunPanel } from '@/components/workspace/workspace-run-panel'

describe('WorkspaceRunPanel', () => {
  it('renders safe agent trace events as a timeline', () => {
    const html = renderToStaticMarkup(
      <WorkspaceRunPanel
        status="streaming"
        assistantText="我正在查找你的书签。"
        traceEvents={[
          {
            type: 'input_normalized',
            title: '清理输入',
            rawInputPreview: '帮我找最近收藏的文章',
            normalizedRequest: '查找收藏的文章',
          },
          {
            type: 'tool_executed',
            title: '执行工具',
            toolName: 'search_workspace',
            publicArgs: { query: '收藏的文章', timeFilterKind: 'vague' },
            resultSummary: '找到 2 条结果',
          },
        ]}
      />
    )

    expect(html).toContain('AI 工作链')
    expect(html).toContain('清理输入')
    expect(html).toContain('查找收藏的文章')
    expect(html).toContain('执行工具')
    expect(html).toContain('找到 2 条结果')
    expect(html).not.toMatch(/system prompt/i)
  })
})
