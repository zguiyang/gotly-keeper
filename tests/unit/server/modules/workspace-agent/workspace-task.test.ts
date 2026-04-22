import { describe, expect, it } from 'vitest'

import {
  WorkspaceTaskValidationError,
  normalizeWorkspaceTask,
  validateWorkspaceTask,
} from '@/server/modules/workspace-agent/workspace-task'

describe('workspaceTask', () => {
  it('accepts a query task for notes', () => {
    const task = validateWorkspaceTask({
      intent: 'query',
      target: 'notes',
      query: '最近的笔记',
    })

    expect(task).toEqual({
      intent: 'query',
      target: 'notes',
      query: '最近的笔记',
    })
  })

  it('accepts summarize tasks without an explicit target', () => {
    const task = validateWorkspaceTask({
      intent: 'summarize',
      query: '最近重点',
      timeRange: {
        type: 'recent',
      },
    })

    expect(task).toEqual({
      intent: 'summarize',
      query: '最近重点',
      timeRange: {
        type: 'recent',
      },
    })
  })

  it('rejects create tasks without payload', () => {
    expect(() =>
      validateWorkspaceTask({
        intent: 'create',
        target: 'notes',
        query: '记一下项目方向',
      })
    ).toThrowError(WorkspaceTaskValidationError)

    expect(() =>
      validateWorkspaceTask({
        intent: 'create',
        target: 'notes',
      })
    ).toThrow('payload is required for create and update tasks')
  })

  it('rejects updates for unsupported targets', () => {
    expect(() =>
      validateWorkspaceTask({
        intent: 'update',
        target: 'notes',
        payload: {
          title: '新版标题',
        },
      })
    ).toThrow('update currently only supports todos')
  })

  it('normalizes empty strings to null and aliases links to bookmarks', () => {
    const task = normalizeWorkspaceTask({
      intent: 'query',
      target: 'links',
      query: '   ',
      subjectHint: '',
      payload: {},
      timeRange: null,
    })

    expect(task).toEqual({
      intent: 'query',
      target: 'bookmarks',
      query: null,
      subjectHint: null,
      payload: null,
      timeRange: null,
    })
  })
})
