import 'server-only'

import { tool } from 'ai'
import { z } from 'zod'

import {
  createWorkspaceLink,
  createWorkspaceNote,
  createWorkspaceTodo,
  reviewWorkspaceUnfinishedTodos,
  searchWorkspaceAssets,
  summarizeWorkspaceRecentBookmarks,
  summarizeWorkspaceRecentNotes,
} from './index'
import { toWorkspaceRunResult } from './workspace-stream'

export function createWorkspaceTools(userId: string) {
  return {
    create_note: tool({
      description: '保存一条普通笔记。',
      inputSchema: z.object({
        text: z.string().trim().min(1),
      }),
      execute: async ({ text }) => {
        return toWorkspaceRunResult(await createWorkspaceNote({ userId, text }))
      },
    }),
    create_todo: tool({
      description: '保存一条待办事项。',
      inputSchema: z.object({
        text: z.string().trim().min(1),
      }),
      execute: async ({ text }) => {
        return toWorkspaceRunResult(await createWorkspaceTodo({ userId, text }))
      },
    }),
    create_link: tool({
      description: '保存一条链接收藏。',
      inputSchema: z.object({
        text: z.string().trim().min(1),
        url: z.url(),
      }),
      execute: async ({ text, url }) => {
        return toWorkspaceRunResult(await createWorkspaceLink({ userId, text, url }))
      },
    }),
    search_assets: tool({
      description: '查询知识库中已保存的内容。',
      inputSchema: z.object({
        query: z.string().trim().min(1),
      }),
      execute: async ({ query }) => {
        const results = await searchWorkspaceAssets({ userId, query })
        return {
          kind: 'query' as const,
          query,
          results,
        }
      },
    }),
    summarize_workspace: tool({
      description: '总结待办、笔记或书签。',
      inputSchema: z.object({
        target: z.enum(['todos', 'notes', 'bookmarks']),
      }),
      execute: async ({ target }) => {
        if (target === 'todos') {
          const review = await reviewWorkspaceUnfinishedTodos({ userId })
          return { kind: 'todo-review' as const, review }
        }

        if (target === 'notes') {
          const summary = await summarizeWorkspaceRecentNotes({ userId })
          return { kind: 'note-summary' as const, summary }
        }

        const summary = await summarizeWorkspaceRecentBookmarks({ userId })
        return { kind: 'bookmark-summary' as const, summary }
      },
    }),
  }
}
