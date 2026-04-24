import { describe, expect, it } from 'vitest'

import {
  WorkspaceTaskRoutingError,
  routeWorkspaceTask,
} from '@/server/modules/workspace-agent/workspace-task-router'

describe('routeWorkspaceTask', () => {
  it('routes note queries to search_notes', () => {
    const plan = routeWorkspaceTask({
      intent: 'query',
      target: 'notes',
      query: '项目复盘',
    })

    expect(plan).toEqual({
      intent: 'query',
      target: 'notes',
      toolName: 'search_notes',
      toolInput: {
        query: '项目复盘',
        subjectHint: null,
        timeRange: null,
        limit: 10,
      },
      needsCompose: false,
    })
  })

  it('routes todo summarize tasks to search_todos with composition enabled', () => {
    const plan = routeWorkspaceTask({
      intent: 'summarize',
      target: 'todos',
      timeRange: {
        type: 'recent',
      },
    })

    expect(plan).toEqual({
      intent: 'summarize',
      target: 'todos',
      toolName: 'search_todos',
      toolInput: {
        query: null,
        subjectHint: null,
        timeRange: {
          type: 'recent',
        },
        limit: 10,
        status: 'all',
      },
      needsCompose: true,
    })
  })

  it('routes bookmark creation to create_bookmark', () => {
    const plan = routeWorkspaceTask({
      intent: 'create',
      target: 'bookmarks',
      payload: {
        url: 'https://example.com',
        title: 'Example',
      },
    })

    expect(plan).toEqual({
      intent: 'create',
      target: 'bookmarks',
      toolName: 'create_bookmark',
      toolInput: {
        url: 'https://example.com',
        title: 'Example',
      },
      needsCompose: false,
    })
  })

  it('routes note creation with markdown content only', () => {
    const plan = routeWorkspaceTask({
      intent: 'create',
      target: 'notes',
      payload: {
        content: '# 轻笔记\n\n记录核心结论',
      },
    })

    expect(plan).toEqual({
      intent: 'create',
      target: 'notes',
      toolName: 'create_note',
      toolInput: {
        content: '# 轻笔记\n\n记录核心结论',
      },
      needsCompose: false,
    })
  })

  it('falls back to recent items when target is missing', () => {
    const plan = routeWorkspaceTask({
      intent: 'query',
      query: '最近内容',
    })

    expect(plan).toEqual({
      intent: 'query',
      target: 'mixed',
      toolName: 'get_recent_items',
      toolInput: {
        targets: ['notes', 'todos', 'bookmarks'],
        timeRange: {
          type: 'recent',
        },
        limitPerTarget: 5,
      },
      needsCompose: false,
    })
  })

  it('throws for unsupported task combinations', () => {
    expect(() =>
      routeWorkspaceTask({
        intent: 'create',
      })
    ).toThrowError(WorkspaceTaskRoutingError)
  })
})
