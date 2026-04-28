// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { WorkspaceRunPanel } from '@/components/workspace/workspace-run-panel'

afterEach(() => {
  cleanup()
})

describe('WorkspaceRunPanel', () => {
  it('renders plan steps and timeline after a successful run', () => {
    render(
      <WorkspaceRunPanel
        status="success"
        assistantText="已保存笔记：首页 slogan 想走轻管家感。"
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
    expect(screen.getAllByText('已保存笔记：首页 slogan 想走轻管家感。')).toHaveLength(2)
    expect(screen.getByText('理解预览')).toBeTruthy()
    expect(screen.getByText('执行步骤')).toBeTruthy()
    expect(screen.getByText('准备执行 1 个任务。')).toBeTruthy()
    expect(screen.getByText('1. 创建笔记')).toBeTruthy()
    expect(screen.getByText('创建笔记：首页 slogan 想走轻管家感')).toBeTruthy()
    expect(screen.getByText('开始: 计划')).toBeTruthy()
    expect(screen.getByText('开始: 创建笔记')).toBeTruthy()
    expect(screen.getByText('完成: 已生成最终结果')).toBeTruthy()
  })

  it('uses timeline to show the active streaming phase', () => {
    render(
      <WorkspaceRunPanel
        status="streaming"
        assistantText={null}
        timeline={[{ type: 'phase_started', phase: 'understand' }]}
      />
    )

    expect(screen.getByText(/正在理解你的输入/)).toBeTruthy()
  })
})
