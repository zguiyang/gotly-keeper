import 'server-only'

import { tool } from 'ai'
import { z } from 'zod'

import {
  bookmarkCommandPayloadSchema,
  noteCommandPayloadSchema,
  searchCommandPayloadSchema,
  summaryCommandPayloadSchema,
  todoCommandPayloadSchema,
  type ParsedCommand,
} from '@/server/lib/ai/ai-schema'

import { toWorkspaceRunResult } from './workspace-run-result'

import {
  createWorkspaceLink,
  createWorkspaceNote,
  createWorkspaceTodo,
  reviewWorkspaceUnfinishedTodos,
  searchWorkspaceAssets,
  summarizeWorkspaceRecentBookmarks,
  summarizeWorkspaceRecentNotes,
} from './index'

const TODO_TARGET_KEYWORDS = ['待办', 'todo', '任务', '未完成']
const NOTE_KEYWORDS = ['笔记', '想法', '备忘', '灵感', '记录']
const BOOKMARK_KEYWORDS = ['收藏', '书签', '链接', '网址', '文章', '网页', 'url']
const URL_REGEX = /https?:\/\/[^\s]+/i

const createNoteToolInputSchema = z.object({
  rawInput: z.string().trim().min(1),
  title: noteCommandPayloadSchema.shape.title.optional(),
  content: noteCommandPayloadSchema.shape.content.optional(),
  summary: noteCommandPayloadSchema.shape.summary.optional(),
})

const createTodoToolInputSchema = z.object({
  rawInput: z.string().trim().min(1),
  title: todoCommandPayloadSchema.shape.title.optional(),
  content: todoCommandPayloadSchema.shape.content.optional(),
  timeText: todoCommandPayloadSchema.shape.timeText.optional(),
  dueAtIso: todoCommandPayloadSchema.shape.dueAtIso.optional(),
})

const createLinkToolInputSchema = z.object({
  rawInput: z.string().trim().min(1),
  url: z.url(),
  title: bookmarkCommandPayloadSchema.shape.title.optional(),
  note: bookmarkCommandPayloadSchema.shape.note.optional(),
  summary: bookmarkCommandPayloadSchema.shape.summary.optional(),
})

const searchAssetsToolInputSchema = z.object({
  query: z.string().trim().min(1),
  typeHint: searchCommandPayloadSchema.shape.typeHint.optional(),
  timeHint: searchCommandPayloadSchema.shape.timeHint.optional(),
  completionHint: searchCommandPayloadSchema.shape.completionHint.optional(),
})

const summarizeWorkspaceToolInputSchema = z.object({
  target: z.enum(['todos', 'notes', 'bookmarks']),
  query: summaryCommandPayloadSchema.shape.query.optional(),
})

type CreateNoteToolInput = z.infer<typeof createNoteToolInputSchema>
type CreateTodoToolInput = z.infer<typeof createTodoToolInputSchema>
type CreateLinkToolInput = z.infer<typeof createLinkToolInputSchema>
type SearchAssetsToolInput = z.infer<typeof searchAssetsToolInputSchema>
type SummarizeWorkspaceToolInput = z.infer<typeof summarizeWorkspaceToolInputSchema>

function resolveSummaryTarget(command: ParsedCommand): SummarizeWorkspaceToolInput['target'] {
  const target = command.summary?.target

  if (target) {
    return target
  }

  const sourceText = command.rawInput ?? command.originalText

  if (TODO_TARGET_KEYWORDS.some((keyword) => sourceText.includes(keyword))) {
    return 'todos'
  }

  if (BOOKMARK_KEYWORDS.some((keyword) => sourceText.includes(keyword))) {
    return 'bookmarks'
  }

  if (NOTE_KEYWORDS.some((keyword) => sourceText.includes(keyword))) {
    return 'notes'
  }

  return 'notes'
}

function resolveLinkUrl(command: ParsedCommand): string {
  const structuredUrl = command.bookmark?.url?.trim()

  if (structuredUrl) {
    return structuredUrl
  }

  const sourceText = command.rawInput ?? command.originalText
  const fallbackUrl = sourceText.match(URL_REGEX)?.[0]?.trim()

  if (fallbackUrl) {
    return fallbackUrl
  }

  throw new Error('LINK_URL_REQUIRED')
}

function getCreateNoteToolInput(command: Extract<ParsedCommand, { operation: 'create_note' }>) {
  return createNoteToolInputSchema.parse({
    rawInput: command.rawInput ?? command.originalText,
    title: command.note?.title ?? null,
    content: command.note?.content ?? command.originalText,
    summary: command.note?.summary ?? null,
  })
}

function getCreateTodoToolInput(command: Extract<ParsedCommand, { operation: 'create_todo' }>) {
  return createTodoToolInputSchema.parse({
    rawInput: command.rawInput ?? command.originalText,
    title: command.todo?.title ?? command.originalText,
    content: command.todo?.content ?? null,
    timeText: command.todo?.timeText ?? null,
    dueAtIso: command.todo?.dueAtIso ?? null,
  })
}

function getCreateLinkToolInput(command: Extract<ParsedCommand, { operation: 'create_link' }>) {
  return createLinkToolInputSchema.parse({
    rawInput: command.rawInput ?? command.originalText,
    url: resolveLinkUrl(command),
    title: command.bookmark?.title ?? null,
    note: command.bookmark?.note ?? null,
    summary: command.bookmark?.summary ?? null,
  })
}

function getSearchAssetsToolInput(command: Extract<ParsedCommand, { operation: 'search_assets' }>) {
  return searchAssetsToolInputSchema.parse({
    query: command.search?.query ?? command.originalText,
    typeHint: command.search?.typeHint ?? null,
    timeHint: command.search?.timeHint ?? null,
    completionHint: command.search?.completionHint ?? null,
  })
}

function describeWorkspaceSearch(input: {
  typeHint?: 'todo' | 'note' | 'link' | null
  timeHint?: string | null
  completionHint?: 'complete' | 'incomplete' | null
}) {
  const typeLabel =
    input.typeHint === 'todo'
      ? '待办'
      : input.typeHint === 'note'
        ? '笔记'
        : input.typeHint === 'link'
          ? '书签'
          : '全部内容'

  const qualifiers: string[] = []

  if (input.completionHint === 'incomplete') {
    qualifiers.push('未完成')
  } else if (input.completionHint === 'complete') {
    qualifiers.push('已完成')
  }

  if (input.timeHint) {
    qualifiers.push(input.timeHint)
  }

  return qualifiers.length > 0 ? `${typeLabel} · ${qualifiers.join(' · ')}` : typeLabel
}

function getSummarizeWorkspaceToolInput(
  command: Extract<ParsedCommand, { operation: 'summarize_workspace' }>
) {
  return summarizeWorkspaceToolInputSchema.parse({
    target: resolveSummaryTarget(command),
    query: command.summary?.query ?? null,
  })
}

function createWorkspaceToolExecutors(userId: string) {
  return {
    create_note: async ({ rawInput, title, content, summary }: CreateNoteToolInput) => {
      return toWorkspaceRunResult(
        await createWorkspaceNote({ userId, rawInput, title, content, summary })
      )
    },
    create_todo: async ({ rawInput, title, content, timeText, dueAtIso }: CreateTodoToolInput) => {
      return toWorkspaceRunResult(
        await createWorkspaceTodo({
          userId,
          rawInput,
          title,
          content,
          timeText,
          dueAt: dueAtIso ? new Date(dueAtIso) : null,
        })
      )
    },
    create_link: async ({ rawInput, url, title, note, summary }: CreateLinkToolInput) => {
      return toWorkspaceRunResult(
        await createWorkspaceLink({
          userId,
          rawInput,
          url,
          title,
          note,
          summary,
        })
      )
    },
    search_assets: async ({ query, typeHint, timeHint, completionHint }: SearchAssetsToolInput) => {
      const results = await searchWorkspaceAssets({
        userId,
        query,
        typeHint: typeHint ?? null,
        timeHint: timeHint ?? null,
        completionHint: completionHint ?? null,
      })

      return {
        kind: 'query' as const,
        query,
        queryDescription: describeWorkspaceSearch({
          typeHint: typeHint ?? null,
          timeHint: timeHint ?? null,
          completionHint: completionHint ?? null,
        }),
        results,
      }
    },
    summarize_workspace: async ({ target, query }: SummarizeWorkspaceToolInput) => {
      if (target === 'todos') {
        const review = await reviewWorkspaceUnfinishedTodos({
          userId,
          query: query ?? null,
        })
        return { kind: 'todo-review' as const, review }
      }

      if (target === 'notes') {
        const summary = await summarizeWorkspaceRecentNotes({
          userId,
          query: query ?? null,
        })
        return { kind: 'note-summary' as const, summary }
      }

      const summary = await summarizeWorkspaceRecentBookmarks({
        userId,
        query: query ?? null,
      })
      return { kind: 'bookmark-summary' as const, summary }
    },
  }
}

export function createWorkspaceTools(userId: string) {
  const executors = createWorkspaceToolExecutors(userId)

  return {
    create_note: tool({
      description: '保存一条普通笔记。',
      inputSchema: createNoteToolInputSchema,
      execute: executors.create_note,
    }),
    create_todo: tool({
      description: '保存一条待办事项。',
      inputSchema: createTodoToolInputSchema,
      execute: executors.create_todo,
    }),
    create_link: tool({
      description: '保存一条链接收藏。',
      inputSchema: createLinkToolInputSchema,
      execute: executors.create_link,
    }),
    search_assets: tool({
      description: '查询知识库中已保存的内容。',
      inputSchema: searchAssetsToolInputSchema,
      execute: executors.search_assets,
    }),
    summarize_workspace: tool({
      description: '总结待办、笔记或书签。',
      inputSchema: summarizeWorkspaceToolInputSchema,
      execute: executors.summarize_workspace,
    }),
  }
}

export async function executeWorkspaceTool(options: {
  userId: string
  command: ParsedCommand
}) {
  const executors = createWorkspaceToolExecutors(options.userId)

  if (options.command.operation === 'create_note') {
    return executors.create_note(getCreateNoteToolInput(options.command))
  }

  if (options.command.operation === 'create_todo') {
    return executors.create_todo(getCreateTodoToolInput(options.command))
  }

  if (options.command.operation === 'create_link') {
    return executors.create_link(getCreateLinkToolInput(options.command))
  }

  if (options.command.operation === 'search_assets') {
    return executors.search_assets(getSearchAssetsToolInput(options.command))
  }

  return executors.summarize_workspace(getSummarizeWorkspaceToolInput(options.command))
}
