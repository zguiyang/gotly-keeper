import { describe, expect, it } from 'vitest'

import { buildBatchAnswer, buildCompletedRunResult } from '@/server/modules/workspace-agent/workspace-run-completed'

describe('workspace-run-completed', () => {
  it('builds a multi-task answer from all successful step results', () => {
    const answer = buildBatchAnswer({
      plan: {
        summary: '准备执行 3 个任务。',
        steps: [
          {
            id: 'step_1',
            toolName: 'create_todo',
            title: '创建待办',
            preview: '创建待办：熬药',
          },
          {
            id: 'step_2',
            toolName: 'create_note',
            title: '创建笔记',
            preview: '创建笔记：不要吃生冷食物',
          },
          {
            id: 'step_3',
            toolName: 'create_bookmark',
            title: '创建书签',
            preview: '创建书签：https://github.com/zguiyang',
          },
        ],
      },
      executeResult: {
        summary: '执行了 3/3 个步骤',
        stepResults: [
          {
            stepId: 'step_1',
            toolName: 'create_todo',
            result: {
              ok: true,
              target: 'todos',
              action: 'create',
              item: {
                title: '熬药',
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
                title: '不要吃生冷食物',
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
                title: 'https://github.com/zguiyang',
              },
            },
          },
        ],
      },
    })

    expect(answer).toBe(
      '已执行 3 个任务：添加待办“熬药”、保存笔记“不要吃生冷食物”、收藏链接 https://github.com/zguiyang。'
    )
  })

  it('keeps all step results in the completed run payload', () => {
    const result = buildCompletedRunResult({
      executeResult: {
        summary: '执行了 2/2 个步骤',
        stepResults: [
          {
            stepId: 'step_1',
            toolName: 'create_todo',
            result: { ok: true, target: 'todos', action: 'create' },
          },
          {
            stepId: 'step_2',
            toolName: 'create_note',
            result: { ok: true, target: 'notes', action: 'create' },
          },
        ],
      },
      answer: '已执行 2 个任务：添加待办、保存笔记。',
      preview: {
        plan: {
          summary: '准备执行 2 个任务。',
          steps: [],
        },
      },
      data: null,
    })

    expect(result.summary).toBe('执行了 2/2 个步骤')
    expect(result.stepResults).toHaveLength(2)
    expect(result.data).toBeNull()
  })
})
