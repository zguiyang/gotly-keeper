// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { TodosClient } from '@/components/workspace/todos-client'
import type { AssetListItem } from '@/shared/assets/assets.types'
import { createAssetFixture } from '@/tests/support/factories/asset.factory'

const toggleCompletionMock = vi.fn<(assetId: string, completed: boolean) => Promise<AssetListItem | null>>(
  async () => null
)

vi.mock('@/client/actions/workspace-actions.client', () => ({
  loadWorkspaceTodoDateMarkers: vi.fn(async () => []),
  loadWorkspaceTodosByDate: vi.fn(async () => []),
}))

vi.mock('@/hooks/workspace/use-asset-mutations', () => ({
  useAssetMutations: () => ({
    updateAsset: vi.fn(),
    archiveAsset: vi.fn(),
    moveToTrash: vi.fn(),
    isPending: () => false,
  }),
}))

vi.mock('@/hooks/workspace/use-todo-completion', () => ({
  useTodoCompletion: () => ({
    state: { pendingId: null, error: null },
    toggleCompletion: toggleCompletionMock,
  }),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}))

vi.mock('@/components/ui/calendar', () => ({
  Calendar: () => <div>Calendar Stub</div>,
  CalendarDayButton: ({ children }: { children?: React.ReactNode }) => <button>{children}</button>,
}))

vi.mock('@/components/workspace/asset-action-menu', () => ({
  AssetActionMenu: () => <div>menu</div>,
}))

vi.mock('@/components/workspace/asset-edit-dialog', () => ({
  AssetEditDialog: () => null,
}))

vi.mock('@/components/workspace/todo-due-time', () => ({
  TodoDueTime: () => <span>due-time</span>,
}))

vi.mock('@/components/workspace/workspace-loading-states', () => ({
  WorkspaceTodosDateLoading: () => <div>loading</div>,
}))

vi.mock('@/components/workspace/workspace-view-primitives', () => ({
  WorkspaceEmptyState: ({ title }: { title: string }) => <div>{title}</div>,
  WorkspacePageHeader: ({ title }: { title: string }) => <div>{title}</div>,
  workspaceMetaTextClassName: 'meta',
  workspaceListSurfaceClassName: 'list-surface',
  workspacePanelSurfaceClassName: 'panel-surface',
  workspaceSurfaceClassName: 'surface',
}))

vi.mock('@/lib/utils', () => ({
  cn: (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(' '),
}))

afterEach(() => {
  toggleCompletionMock.mockReset()
  cleanup()
})

describe('TodosClient', () => {
  it('keeps overdue and completed sections visible when selected date is empty', () => {
    const overdueTodo = createAssetFixture({
      id: 'overdue-1',
      type: 'todo',
      title: '过期待办',
      originalText: '过期待办',
      dueAt: new Date('2026-04-24T01:00:00.000Z'),
      createdAt: new Date('2026-04-20T01:00:00.000Z'),
    })
    const completedTodo = createAssetFixture({
      id: 'completed-1',
      type: 'todo',
      title: '已完成待办',
      originalText: '已完成待办',
      completedAt: new Date('2026-04-25T02:00:00.000Z'),
      dueAt: new Date('2026-04-25T01:00:00.000Z'),
      updatedAt: new Date('2026-04-25T02:00:00.000Z'),
    })

    render(
      <TodosClient
        selectedDate="2026-04-25"
        todayDate="2026-04-25"
        initialCompletedTodos={[completedTodo]}
        initialOverdueTodos={[overdueTodo]}
        initialSelectedDateTodos={[]}
        initialDateMarkers={[]}
        initialUnscheduledTodos={[]}
      />
    )

    expect(screen.queryByText('暂无待办')).toBeNull()
    expect(screen.getByText('已过期待办')).toBeTruthy()
    expect(screen.getByText('已完成')).toBeTruthy()
    expect(screen.getByText('按日期查看')).toBeTruthy()
  })

  it('moves a todo from overdue to completed after toggling completion', async () => {
    const overdueTodo = createAssetFixture({
      id: 'overdue-2',
      type: 'todo',
      title: '需要补交材料',
      originalText: '需要补交材料',
      dueAt: new Date('2026-04-24T01:00:00.000Z'),
      createdAt: new Date('2026-04-20T01:00:00.000Z'),
    })
    const completedTodo = {
      ...overdueTodo,
      completed: true,
      updatedAt: new Date('2026-04-25T03:00:00.000Z'),
    }

    toggleCompletionMock.mockResolvedValueOnce(completedTodo)

    render(
      <TodosClient
        selectedDate="2026-04-25"
        todayDate="2026-04-25"
        initialCompletedTodos={[]}
        initialOverdueTodos={[overdueTodo]}
        initialSelectedDateTodos={[]}
        initialDateMarkers={[]}
        initialUnscheduledTodos={[]}
      />
    )

    const toggleButtons = screen.getAllByRole('button', { name: '标记为已完成' })
    fireEvent.click(toggleButtons[0])

    await waitFor(() => {
      expect(toggleCompletionMock).toHaveBeenCalledWith('overdue-2', true)
      expect(screen.getByText('已完成')).toBeTruthy()
      expect(screen.queryByText('已过期待办')).toBeNull()
      expect(screen.getByText('需要补交材料')).toBeTruthy()
    })
  })
})
