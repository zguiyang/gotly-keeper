// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { WorkspaceRunPanel } from '@/components/workspace/workspace-run-panel'

afterEach(() => {
  cleanup()
})

describe('WorkspaceRunPanel', () => {
  it('collapses to the final result after a successful single-task run', () => {
    render(
      <WorkspaceRunPanel
        status="success"
        assistantText="已保存笔记：首页 slogan 想走轻管家感。"
        elapsedMs={117000}
        result={{
          action: 'create',
          ok: true,
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
            result: { ok: true },
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

    expect(screen.getByText('已创建笔记')).toBeTruthy()
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
    expect(screen.getByText('编辑（即将支持）')).toBeTruthy()
  })
})
