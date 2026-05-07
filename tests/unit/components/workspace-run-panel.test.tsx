// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { WorkspaceRunPanel } from '@/components/workspace/workspace-run-panel'

afterEach(() => {
  cleanup()
})

describe('WorkspaceRunPanel', () => {
  it('renders a unified shell for awaiting_user status', () => {
    render(
      <WorkspaceRunPanel
        status="awaiting_user"
        assistantText={null}
        interaction={{
          runId: 'run_1',
          id: 'interaction_1',
          type: 'confirm_plan',
          message: '确认执行？',
          actions: ['confirm', 'cancel'],
          plan: { summary: 'test', steps: [] },
        }}
        onResume={() => {}}
      />
    )

    expect(screen.getByTestId('workspace-run-panel')).toBeTruthy()
    expect(screen.getByTestId('workspace-run-panel-header')).toBeTruthy()
    expect(screen.getByTestId('workspace-run-panel-content')).toBeTruthy()
    expect(screen.getByTestId('workspace-run-panel-actions')).toBeTruthy()
  })

  it('renders duplicate confirmation actions and emits create', () => {
    const onResume = vi.fn()

    render(
      <WorkspaceRunPanel
        status="awaiting_user"
        assistantText={null}
        interaction={{
          runId: 'run_1',
          id: 'interaction_duplicate',
          type: 'confirm_duplicate',
          source: 'bookmark_precheck',
          target: 'bookmark',
          message: '发现可能重复的书签。',
          actions: ['create', 'skip', 'cancel'],
          current: {
            stepId: 'step_1',
            title: 'OpenAI',
            preview: '创建书签：OpenAI',
          },
          duplicates: [{ id: 'bookmark_1', label: 'OpenAI', reason: 'URL 完全一致' }],
        }}
        onResume={onResume}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: '仍然创建' }))
    expect(onResume).toHaveBeenCalledWith({
      type: 'confirm_duplicate',
      action: 'create',
    })
  })

  it('renders candidate selection actions', () => {
    const onResume = vi.fn()

    render(
      <WorkspaceRunPanel
        status="awaiting_user"
        assistantText={null}
        interaction={{
          runId: 'run_1',
          id: 'interaction_select',
          type: 'select_candidate',
          target: 'todo',
          message: '请选择要更新的待办',
          actions: ['select', 'skip', 'cancel'],
          candidates: [
            { id: 'todo_1', label: '发报价给老王' },
            { id: 'todo_2', label: '整理报价模板' },
          ],
        }}
        onResume={onResume}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /整理报价模板/ }))
    fireEvent.click(screen.getByRole('button', { name: '使用这条候选' }))
    expect(onResume).toHaveBeenCalledWith({
      type: 'select_candidate',
      action: 'select',
      candidateId: 'todo_2',
    })
  })

  it('renders confirm_plan cancel action', () => {
    const onResume = vi.fn()

    render(
      <WorkspaceRunPanel
        status="awaiting_user"
        assistantText={null}
        interaction={{
          runId: 'run_1',
          id: 'interaction_1',
          type: 'confirm_plan',
          message: '确认拆分结果？',
          actions: ['confirm', 'cancel'],
          plan: {
            summary: '将分别保存 2 条内容',
            steps: [
              { id: 'step_1', toolName: 'create_todo', title: '创建待办', preview: '创建待办：发报价' },
            ],
          },
        }}
        onResume={onResume}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: '取消' }))
    expect(onResume).toHaveBeenCalledWith({
      type: 'confirm_plan',
      action: 'cancel',
    })
  })
})
