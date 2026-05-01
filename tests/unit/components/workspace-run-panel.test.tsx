// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { WorkspaceRunPanel } from '@/components/workspace/workspace-run-panel'

import type { AssetListItem } from '@/shared/assets/assets.types'
import type { WorkspaceInteraction } from '@/shared/workspace/workspace-run-protocol'

afterEach(() => {
  cleanup()
})

function createAssetItem(overrides: Partial<AssetListItem> = {}): AssetListItem {
  return {
    id: 'asset_1',
    originalText: '原始内容',
    title: '默认标题',
    excerpt: '默认摘要',
    type: 'note',
    url: null,
    timeText: null,
    dueAt: null,
    completed: false,
    createdAt: new Date('2026-04-27T00:00:00.000Z'),
    ...overrides,
  }
}

describe('WorkspaceRunPanel', () => {
  describe('shell layout contract', () => {
    it('renders a unified shell with header, content, and actions for awaiting_user status', () => {
      render(
        <WorkspaceRunPanel
          status="awaiting_user"
          assistantText={null}
          interaction={{
            runId: 'run_1',
            id: 'interaction_1',
            type: 'confirm_plan',
            message: '确认执行？',
            actions: ['confirm', 'edit', 'cancel'],
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

    it('renders a unified shell for streaming status', () => {
      render(
        <WorkspaceRunPanel
          status="streaming"
          assistantText={null}
        />
      )

      expect(screen.getByTestId('workspace-run-panel')).toBeTruthy()
      expect(screen.getByTestId('workspace-run-panel-header')).toBeTruthy()
      expect(screen.getByTestId('workspace-run-panel-content')).toBeTruthy()
    })

    it('renders a unified shell for success status', () => {
      render(
        <WorkspaceRunPanel
          status="success"
          assistantText="处理完成"
        />
      )

      expect(screen.getByTestId('workspace-run-panel')).toBeTruthy()
      expect(screen.getByTestId('workspace-run-panel-header')).toBeTruthy()
      expect(screen.getByTestId('workspace-run-panel-content')).toBeTruthy()
    })

    it('uses internal overflow on content area', () => {
      render(
        <WorkspaceRunPanel
          status="streaming"
          assistantText={null}
        />
      )

      const content = screen.getByTestId('workspace-run-panel-content')
      expect(content.className).toMatch(/overflow-y-auto/)
    })

    it('renders duplicate confirmation actions for awaiting_user status', () => {
      const onResume = vi.fn()

      render(
        <WorkspaceRunPanel
          status="awaiting_user"
          assistantText={null}
          interaction={{
            runId: 'run_1',
            id: 'interaction_duplicate',
            type: 'confirm_duplicate',
            target: 'bookmark',
            message: '发现可能重复的书签。',
            actions: ['create', 'skip', 'cancel'],
            current: {
              stepId: 'step_1',
              title: 'OpenAI',
              preview: '创建书签：OpenAI',
            },
            duplicates: [
              {
                id: 'bookmark_1',
                label: 'OpenAI',
                reason: 'URL 完全一致',
              },
            ],
          }}
          onResume={onResume}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: '仍然创建' }))
      expect(onResume).toHaveBeenCalledWith({
        type: 'confirm_duplicate',
        action: 'create',
      })
      expect(screen.getByRole('button', { name: '跳过这项' })).toBeTruthy()
      expect(screen.getByRole('button', { name: '取消' })).toBeTruthy()
    })
  })

  describe('streaming narrative', () => {
    it('shows lightweight progress for a single-task streaming state', () => {
      render(
        <WorkspaceRunPanel
          status="streaming"
          assistantText={null}
          timeline={[
            { type: 'phase_started', phase: 'plan' },
            { type: 'phase_completed', phase: 'plan' },
            { type: 'tool_call_started', toolName: 'create_note', preview: '正在创建笔记' },
          ]}
          planPreview={{
            summary: '准备执行 1 个任务。',
            steps: [{ id: 'step_1', toolName: 'create_note', title: '创建笔记', preview: '创建笔记：首页 slogan 想走轻管家感' }],
          }}
        />
      )

      expect(screen.getByTestId('workspace-run-panel')).toBeTruthy()
    })

    it('shows a single active stage heading without pill overload', () => {
      render(
        <WorkspaceRunPanel
          status="streaming"
          assistantText={null}
          timeline={[
            { type: 'phase_started', phase: 'plan' },
            { type: 'phase_completed', phase: 'plan' },
            { type: 'tool_call_started', toolName: 'create_todo', preview: '创建待办：明天下午发报价' },
          ]}
          planPreview={{
            summary: '准备执行 2 个任务。',
            steps: [
              { id: 'step_1', toolName: 'create_todo', title: '创建待办', preview: '创建待办：明天下午发报价' },
              { id: 'step_2', toolName: 'create_note', title: '创建笔记', preview: '创建笔记：首页文案要更轻' },
            ],
          }}
        />
      )

      const pills = screen.queryAllByText('处理中')
      expect(pills.length).toBeLessThan(2)
    })
  })

  describe('details disclosure', () => {
    it('shows a details toggle for preview data', () => {
      render(
        <WorkspaceRunPanel
          status="success"
          assistantText="已保存笔记。"
          result={{
            summary: '已保存笔记。',
            preview: null,
            data: {
              ok: true,
              action: 'create',
              target: 'notes',
              item: { id: 'note_1', originalText: 'test', title: 'test', excerpt: 'test', type: 'note', url: null, timeText: null, dueAt: null, completed: false, createdAt: new Date() },
            },
          }}
          understandingPreview={{
            rawInput: '记一下：首页 slogan 想走轻管家感',
            normalizedInput: '记一下：首页 slogan 想走轻管家感',
            draftTasks: [],
            corrections: [],
          }}
        />
      )

      expect(screen.getByRole('button', { name: /展开详情|查看详情/ })).toBeTruthy()
    })

    it('shows a details toggle when preview data can be derived from timeline', () => {
      render(
        <WorkspaceRunPanel
          status="success"
          assistantText="已保存笔记。"
          timeline={[
            {
              type: 'phase_completed',
              phase: 'preview',
              output: {
                understanding: {
                  rawInput: '记一下：首页 slogan 想走轻管家感',
                  normalizedInput: '记一下：首页 slogan 想走轻管家感',
                  draftTasks: [],
                  corrections: [],
                },
                plan: {
                  summary: '准备执行 1 个任务。',
                  steps: [
                    {
                      id: 'step_1',
                      toolName: 'create_note',
                      title: '创建笔记',
                      preview: '创建笔记：首页 slogan 想走轻管家感',
                    },
                  ],
                },
              },
            },
          ]}
        />
      )

      expect(screen.getByRole('button', { name: /展开详情|查看详情/ })).toBeTruthy()
    })

    it('moves raw input behind disclosure', () => {
      render(
        <WorkspaceRunPanel
          status="success"
          assistantText="已保存笔记。"
          result={{
            summary: '已保存笔记。',
            preview: null,
            data: {
              ok: true,
              action: 'create',
              target: 'notes',
              item: { id: 'note_1', originalText: 'test', title: 'test', excerpt: 'test', type: 'note', url: null, timeText: null, dueAt: null, completed: false, createdAt: new Date() },
            },
          }}
          understandingPreview={{
            rawInput: '记一下：首页 slogan 想走轻管家感',
            normalizedInput: '标准化后的输入',
            draftTasks: [],
            corrections: ['修正1'],
          }}
        />
      )

      expect(screen.queryByText('标准化后')).toBeNull()
      expect(screen.getByText(/展开详情|查看详情/)).toBeTruthy()
    })

    it('does not show disclosure when no preview data exists', () => {
      render(
        <WorkspaceRunPanel
          status="success"
          assistantText="处理完成"
        />
      )

      expect(screen.queryByRole('button', { name: /展开详情|查看详情/ })).toBeNull()
    })
  })

  describe('layout integration', () => {
    it('renders the panel within the shell without unbounded growth', () => {
      render(
        <WorkspaceRunPanel
          status="streaming"
          assistantText={null}
        />
      )

      const panel = screen.getByTestId('workspace-run-panel')
      const header = screen.getByTestId('workspace-run-panel-header')
      const content = screen.getByTestId('workspace-run-panel-content')

      expect(panel).toBeTruthy()
      expect(header).toBeTruthy()
      expect(content).toBeTruthy()
      expect(content.className).toMatch(/overflow-y-auto/)
    })
  })

  describe('final result hierarchy', () => {
    it('shows result items without replaying full plan text', () => {
      render(
        <WorkspaceRunPanel
          status="success"
          assistantText="已保存笔记。"
          result={{
            summary: '执行了 1/1 个步骤',
            preview: null,
            stepResults: [
              {
                stepId: 'step_1',
                toolName: 'create_note',
                result: {
                  ok: true,
                  target: 'notes',
                  action: 'create',
                  item: createAssetItem({ id: 'note_1', originalText: 'test', title: 'test', excerpt: 'test' }),
                },
              },
            ],
          }}
        />
      )

      expect(screen.getByText('已保存笔记。')).toBeTruthy()
    })

    it('prefers concise summary over duplicated plan text', () => {
      render(
        <WorkspaceRunPanel
          status="success"
          assistantText="已完成全部操作。"
          result={{
            summary: '已完成全部操作。',
            preview: null,
            data: {
              ok: true,
              action: 'create',
              target: 'notes',
              item: { id: 'note_1', originalText: 'test', title: 'test', excerpt: 'test', type: 'note', url: null, timeText: null, dueAt: null, completed: false, createdAt: new Date() },
            },
          }}
        />
      )

      expect(screen.getByText('已完成全部操作。')).toBeTruthy()
    })
  })

  it('collapses to the final result after a successful single-task run', () => {
    render(
      <WorkspaceRunPanel
        status="success"
        assistantText="已保存笔记：首页 slogan 想走轻管家感。"
        elapsedMs={117000}
        result={{
          summary: '执行了 1/1 个步骤',
          preview: null,
          data: {
            ok: true,
            action: 'create',
            target: 'notes',
            item: {
              id: 'note_1',
              originalText: '首页 slogan 想走轻管家感',
              title: '首页 slogan 想走轻管家感',
              excerpt: '首页 slogan 想走轻管家感',
              type: 'note',
              content: '首页 slogan 想走轻管家感',
              summary: null,
              url: null,
              timeText: null,
              dueAt: null,
              completed: false,
              bookmarkMeta: null,
              lifecycleStatus: 'active',
              archivedAt: null,
              trashedAt: null,
              createdAt: new Date('2026-04-28T12:52:51.899Z'),
              updatedAt: new Date('2026-04-28T12:52:51.899Z'),
            },
          },
        }}
        timeline={[
          { type: 'phase_started', phase: 'plan' },
          { type: 'phase_completed', phase: 'plan' },
          {
            type: 'tool_call_started',
            toolName: 'create_note',
            preview: '首页 slogan 想走轻管家感',
          },
          {
            type: 'tool_call_completed',
            toolName: 'create_note',
            result: { ok: true, target: 'notes', action: 'create', item: null },
          },
          {
            type: 'run_completed',
            result: {
              summary: '执行了 1/1 个步骤',
              answer: '已保存笔记：首页 slogan 想走轻管家感。',
              preview: null,
            },
          },
        ]}
        understandingPreview={{
          rawInput: '记一下：首页 slogan 想走轻管家感',
          normalizedInput: '记一下：首页 slogan 想走轻管家感',
          draftTasks: [
            {
              id: 'task_1',
              intent: 'create',
              target: 'notes',
              title: '首页 slogan 想走轻管家感',
              confidence: 0.95,
              ambiguities: [],
              corrections: [],
              slots: {},
            },
          ],
          corrections: [],
        }}
        planPreview={{
          summary: '准备执行 1 个任务。',
          steps: [
            {
              id: 'step_1',
              toolName: 'create_note',
              title: '创建笔记',
              preview: '创建笔记：首页 slogan 想走轻管家感',
            },
          ],
        }}
      />
    )

    expect(screen.getByText('已保存笔记：首页 slogan 想走轻管家感。')).toBeTruthy()
    expect(screen.getByText('耗时 1m57s')).toBeTruthy()
    expect(screen.queryByText('理解预览')).toBeNull()
    expect(screen.queryByText('执行步骤')).toBeNull()
    expect(screen.queryByText('执行时间线')).toBeNull()
  })

  it('shows two streaming lines for a single task', () => {
    render(
      <WorkspaceRunPanel
        status="streaming"
        assistantText={null}
        timeline={[
          { type: 'phase_started', phase: 'understand' },
          { type: 'phase_started', phase: 'plan' },
        ]}
        planPreview={{
          summary: '准备执行 1 个任务。',
          steps: [
            {
              id: 'step_1',
              toolName: 'create_note',
              title: '创建笔记',
              preview: '创建笔记：首页 slogan 想走轻管家感',
            },
          ],
        }}
      />
    )

    expect(screen.getByText(/正在规划执行步骤/)).toBeTruthy()
    expect(screen.getByText(/正在理解你的输入/)).toBeTruthy()
  })

  it('shows a compact queue for multi-task streaming', () => {
    render(
      <WorkspaceRunPanel
        status="streaming"
        assistantText={null}
        timeline={[
          { type: 'phase_started', phase: 'plan' },
          {
            type: 'tool_call_started',
            toolName: 'create_note',
            preview: '创建笔记：首页 slogan 想走轻管家感',
          },
        ]}
        planPreview={{
          summary: '准备执行 3 个任务。',
          steps: [
            {
              id: 'step_1',
              toolName: 'create_note',
              title: '创建笔记',
              preview: '创建笔记：首页 slogan 想走轻管家感',
            },
            {
              id: 'step_2',
              toolName: 'create_todo',
              title: '创建待办',
              preview: '创建待办：明天下午发报价',
            },
            {
              id: 'step_3',
              toolName: 'query_assets',
              title: '查询内容',
              preview: '查询内容：最近待办',
            },
          ],
        }}
      />
    )

    expect(screen.getByText('准备执行 3 个任务。')).toBeTruthy()
    expect(screen.getByText('创建笔记：首页 slogan 想走轻管家感')).toBeTruthy()
    expect(screen.getByText('创建待办：明天下午发报价')).toBeTruthy()
    expect(screen.queryByText('查询内容：最近待办')).toBeNull()
  })

  it('shows a compact confirmation summary for multi-task plans', () => {
    render(
      <WorkspaceRunPanel
        status="awaiting_user"
        assistantText={null}
        interaction={{
          runId: 'run_1',
          id: 'interaction_1',
          type: 'confirm_plan',
          message: '这些动作会一起执行，是否继续？',
          actions: ['confirm', 'edit', 'cancel'],
          plan: {
            summary: '准备执行 3 个任务。',
            steps: [
              {
                id: 'step_1',
                toolName: 'create_note',
                title: '创建笔记',
                preview: '创建笔记：首页 slogan 想走轻管家感',
              },
              {
                id: 'step_2',
                toolName: 'create_todo',
                title: '创建待办',
                preview: '创建待办：明天下午发报价',
              },
              {
                id: 'step_3',
                toolName: 'query_assets',
                title: '查询内容',
                preview: '查询内容：最近待办',
              },
            ],
          },
        }}
        onResume={() => {}}
      />
    )

    expect(screen.getByText('这些动作会一起执行，是否继续？')).toBeTruthy()
    expect(screen.getByText('准备执行 3 个任务。')).toBeTruthy()
    expect(screen.getByText('创建笔记：首页 slogan 想走轻管家感')).toBeTruthy()
    expect(screen.getByText('创建待办：明天下午发报价')).toBeTruthy()
    expect(screen.queryByText('查询内容：最近待办')).toBeNull()
    expect(screen.queryByText('编辑（即将支持）')).toBeNull()
  })

  it('shows all final results for a successful multi-task run', () => {
    render(
      <WorkspaceRunPanel
        status="success"
        assistantText="已执行 3 个任务：添加待办“熬药”、保存笔记“不要吃生冷食物”、收藏链接 https://github.com/zguiyang。"
        elapsedMs={2400}
        result={{
          summary: '执行了 3/3 个步骤',
          preview: null,
          stepResults: [
            {
              stepId: 'step_1',
              toolName: 'create_todo',
              result: {
                ok: true,
                target: 'todos',
                action: 'create',
                item: {
                  id: 'todo_1',
                  originalText: '熬药',
                  title: '熬药',
                  excerpt: '熬药',
                  type: 'todo',
                  content: null,
                  url: null,
                  timeText: null,
                  dueAt: null,
                  completed: false,
                  bookmarkMeta: null,
                  lifecycleStatus: 'active',
                  archivedAt: null,
                  trashedAt: null,
                  createdAt: new Date('2026-04-29T01:24:00.902Z'),
                  updatedAt: new Date('2026-04-29T01:24:00.902Z'),
                },
              },
            },
            {
              stepId: 'step_2',
              toolName: 'create_note',
              result: {
                ok: true,
                target: 'notes',
                action: 'create',
                item: {
                  id: 'note_1',
                  originalText: '不要吃生冷食物',
                  title: '不要吃生冷食物',
                  excerpt: '不要吃生冷食物',
                  type: 'note',
                  content: '不要吃生冷食物',
                  summary: null,
                  url: null,
                  timeText: null,
                  dueAt: null,
                  completed: false,
                  bookmarkMeta: null,
                  lifecycleStatus: 'active',
                  archivedAt: null,
                  trashedAt: null,
                  createdAt: new Date('2026-04-29T01:24:00.914Z'),
                  updatedAt: new Date('2026-04-29T01:24:00.914Z'),
                },
              },
            },
            {
              stepId: 'step_3',
              toolName: 'create_bookmark',
              result: {
                ok: true,
                target: 'bookmarks',
                action: 'create',
                item: {
                  id: 'bookmark_1',
                  originalText: 'https://github.com/zguiyang',
                  title: 'https://github.com/zguiyang',
                  excerpt: 'https://github.com/zguiyang',
                  type: 'link',
                  note: null,
                  summary: null,
                  url: 'https://github.com/zguiyang',
                  timeText: null,
                  dueAt: null,
                  completed: false,
                  bookmarkMeta: {
                    status: 'pending',
                    title: null,
                    icon: null,
                    bookmarkType: null,
                    description: null,
                    contentSummary: null,
                    errorCode: null,
                    errorMessage: null,
                    updatedAt: '2026-04-29T01:24:00.927Z',
                  },
                  lifecycleStatus: 'active',
                  archivedAt: null,
                  trashedAt: null,
                  createdAt: new Date('2026-04-29T01:24:00.921Z'),
                  updatedAt: new Date('2026-04-29T01:24:00.921Z'),
                },
              },
            },
          ],
        }}
      />
    )

    expect(screen.getByText('执行了 3/3 个步骤')).toBeTruthy()
    expect(screen.getByText('已执行 3 个任务：添加待办“熬药”、保存笔记“不要吃生冷食物”、收藏链接 https://github.com/zguiyang。')).toBeTruthy()
    expect(screen.getByText('已创建待办')).toBeTruthy()
    expect(screen.getByText('已创建笔记')).toBeTruthy()
    expect(screen.getByText('已创建书签')).toBeTruthy()
    expect(screen.getAllByText('熬药').length).toBeGreaterThan(0)
    expect(screen.getAllByText('不要吃生冷食物').length).toBeGreaterThan(0)
    expect(screen.getAllByText('https://github.com/zguiyang').length).toBeGreaterThan(0)
    expect(screen.getByText('耗时 2s')).toBeTruthy()
  })

  describe('shell layout DOM contract', () => {
    it('shell has flex-col and max-height', () => {
      render(
        <WorkspaceRunPanel
          status="streaming"
          assistantText={null}
        />
      )

      const shell = screen.getByTestId('workspace-run-panel')
      expect(shell.className).toMatch(/flex-col/)
      expect(shell.className).toMatch(/max-h/)
    })

    it('content area has flex-1 min-h-0 and overflow-y-auto', () => {
      render(
        <WorkspaceRunPanel
          status="streaming"
          assistantText={null}
        />
      )

      const content = screen.getByTestId('workspace-run-panel-content')
      expect(content.className).toMatch(/flex-1/)
      expect(content.className).toMatch(/min-h-0/)
      expect(content.className).toMatch(/overflow-y-auto/)
      expect(content.className).toMatch(/pb-4/)
    })

    it('action bar is sticky at bottom', () => {
      render(
        <WorkspaceRunPanel
          status="awaiting_user"
          assistantText={null}
          interaction={{
            runId: 'run_1',
            id: 'interaction_1',
            type: 'confirm_plan',
            message: '确认执行？',
            actions: ['confirm', 'edit', 'cancel'],
            plan: { summary: 'test', steps: [] },
          }}
          onResume={() => {}}
        />
      )

      const actions = screen.getByTestId('workspace-run-panel-actions')
      expect(actions.className).toMatch(/sticky/)
    })
  })

  describe('select_candidate unified footer', () => {
    it('enables select in shell footer after choosing a candidate and submits the selected id', () => {
      const onResume = vi.fn()

      render(
        <WorkspaceRunPanel
          status="awaiting_user"
          assistantText={null}
          interaction={{
            runId: 'run_1',
            id: 'interaction_1',
            type: 'select_candidate',
            target: 'todo',
            message: '请选择',
            actions: ['select', 'skip', 'cancel'],
            candidates: [{ id: 'todo_1', label: '发报价', reason: '匹配' }],
          }}
          onResume={onResume}
        />
      )

      const selectButton = screen.getByRole('button', { name: '使用这条候选' })
      expect((selectButton as HTMLButtonElement).disabled).toBe(true)

      fireEvent.click(screen.getByRole('button', { name: '发报价 匹配' }))

      expect((selectButton as HTMLButtonElement).disabled).toBe(false)
      fireEvent.click(selectButton)

      expect(onResume).toHaveBeenCalledWith({
        type: 'select_candidate',
        action: 'select',
        candidateId: 'todo_1',
      })

      expect(screen.getByRole('button', { name: '跳过' })).toBeTruthy()
      expect(screen.getByRole('button', { name: '取消' })).toBeTruthy()
    })
  })

  describe('clarify_slots unified footer', () => {
    it('respects required fields before submitting from the shell footer', () => {
      const onResume = vi.fn()

      render(
        <WorkspaceRunPanel
          status="awaiting_user"
          assistantText={null}
          interaction={{
            runId: 'run_1',
            id: 'interaction_1',
            type: 'clarify_slots',
            message: '补充信息',
            actions: ['submit', 'cancel'],
            fields: [{ key: 'date', label: '日期', required: true }],
          }}
          onResume={onResume}
        />
      )

      const submitButton = screen.getByRole('button', { name: '提交信息' })
      fireEvent.click(submitButton)
      expect(onResume).not.toHaveBeenCalled()

      fireEvent.change(screen.getByLabelText('日期*'), { target: { value: '2026-05-01' } })
      fireEvent.click(submitButton)

      expect(onResume).toHaveBeenCalledWith({
        type: 'clarify_slots',
        action: 'submit',
        values: {
          date: '2026-05-01',
        },
      })

      expect(screen.getByRole('button', { name: '取消' })).toBeTruthy()
    })
  })

  describe('edit_draft_tasks stale state', () => {
    it('does not retain old task values across interactions', () => {
      const firstInteraction: WorkspaceInteraction = {
        runId: 'run_1',
        id: 'interaction_1',
        type: 'edit_draft_tasks',
        message: '编辑任务',
        actions: ['save', 'cancel'],
        tasks: [
          {
            id: 'task_1',
            intent: 'create',
            target: 'notes',
            title: '旧任务标题',
            confidence: 0.9,
            ambiguities: [],
            corrections: [],
            slots: {},
          },
        ],
      }

      const secondInteraction: WorkspaceInteraction = {
        runId: 'run_2',
        id: 'interaction_2',
        type: 'edit_draft_tasks',
        message: '编辑任务',
        actions: ['save', 'cancel'],
        tasks: [
          {
            id: 'task_2',
            intent: 'create',
            target: 'notes',
            title: '新任务标题',
            confidence: 0.9,
            ambiguities: [],
            corrections: [],
            slots: {},
          },
        ],
      }

      const { rerender } = render(
        <WorkspaceRunPanel
          status="awaiting_user"
          assistantText={null}
          interaction={firstInteraction}
          onResume={() => {}}
        />
      )

      expect(screen.getByDisplayValue('旧任务标题')).toBeTruthy()
      expect(screen.queryByDisplayValue('新任务标题')).toBeNull()

      rerender(
        <WorkspaceRunPanel
          status="awaiting_user"
          assistantText={null}
          interaction={secondInteraction}
          onResume={() => {}}
        />
      )

      expect(screen.queryByDisplayValue('旧任务标题')).toBeNull()
      expect(screen.getByDisplayValue('新任务标题')).toBeTruthy()
    })
  })

  describe('error state recovery guidance', () => {
    it('includes heading and helper text for actionable errors', () => {
      render(
        <WorkspaceRunPanel
          status="error"
          assistantText={null}
          errorMessage="没有理解这次请求。"
        />
      )

      expect(screen.getByText('这次没有完成处理')).toBeTruthy()
      expect(screen.getByText('没有理解这次请求。')).toBeTruthy()
      expect(screen.getByText(/可以换成更明确的说法/)).toBeTruthy()
    })
  })
})
