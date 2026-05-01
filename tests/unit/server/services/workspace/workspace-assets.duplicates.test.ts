import { beforeEach, describe, expect, it, vi } from 'vitest'

const notesMock = vi.hoisted(() => ({
  findDuplicateNotes: vi.fn(),
}))

const todosMock = vi.hoisted(() => ({
  findDuplicateTodos: vi.fn(),
}))

const bookmarksMock = vi.hoisted(() => ({
  findDuplicateBookmarks: vi.fn(),
}))

vi.mock('@/server/services/notes', () => ({
  findDuplicateNotes: notesMock.findDuplicateNotes,
}))

vi.mock('@/server/services/todos', () => ({
  findDuplicateTodos: todosMock.findDuplicateTodos,
}))

vi.mock('@/server/services/bookmarks', () => ({
  findDuplicateBookmarks: bookmarksMock.findDuplicateBookmarks,
}))

const { findWorkspaceCreateDuplicates } = await import('@/server/services/workspace/workspace-assets.service')

describe('workspace-assets duplicate checks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('finds bookmark duplicates by exact url', async () => {
    bookmarksMock.findDuplicateBookmarks.mockResolvedValue([
      {
        id: 'bookmark_1',
        originalText: 'https://openai.com',
        title: 'OpenAI',
        excerpt: 'OpenAI',
        type: 'link',
        url: 'https://openai.com',
        createdAt: new Date('2026-04-27T00:00:00.000Z'),
      },
    ])

    const result = await findWorkspaceCreateDuplicates({
      userId: 'user_1',
      steps: [
        {
          stepId: 'step_1',
          action: 'create_bookmark',
          target: 'bookmarks',
          title: 'OpenAI',
          url: 'https://openai.com',
        },
      ],
    })

    expect(result).toEqual([
      {
        stepId: 'step_1',
        target: 'bookmark',
        duplicates: [
          {
            id: 'bookmark_1',
            label: 'OpenAI',
            reason: expect.stringContaining('URL'),
          },
        ],
      },
    ])
  })
})
