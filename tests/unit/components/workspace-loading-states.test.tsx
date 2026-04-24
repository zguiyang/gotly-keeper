import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import {
  WorkspaceAllLoading,
  WorkspaceLifecycleLoading,
  WorkspaceTodosDateLoading,
  WorkspaceTodosLoading,
} from '@/components/workspace/workspace-loading-states'

describe('workspace loading states', () => {
  it('renders the all-content loading skeleton with timeline copy', () => {
    const markup = renderToStaticMarkup(<WorkspaceAllLoading />)

    expect(markup).toContain('知识库')
    expect(markup).toContain('时间线同步中')
    expect(markup).toContain('今天')
  })

  it('renders todo loading skeletons for page and date refreshes', () => {
    const pageMarkup = renderToStaticMarkup(<WorkspaceTodosLoading />)
    const dateMarkup = renderToStaticMarkup(<WorkspaceTodosDateLoading />)

    expect(pageMarkup).toContain('待办')
    expect(pageMarkup).toContain('日历同步中')
    expect(dateMarkup).toContain('任务列表同步中')
  })

  it('renders lifecycle loading skeletons with mode-specific copy', () => {
    const archiveMarkup = renderToStaticMarkup(<WorkspaceLifecycleLoading mode="archive" />)
    const trashMarkup = renderToStaticMarkup(<WorkspaceLifecycleLoading mode="trash" />)

    expect(archiveMarkup).toContain('归档')
    expect(archiveMarkup).toContain('正在整理已归档内容')
    expect(trashMarkup).toContain('回收站')
    expect(trashMarkup).toContain('正在检查待清理内容')
  })
})
