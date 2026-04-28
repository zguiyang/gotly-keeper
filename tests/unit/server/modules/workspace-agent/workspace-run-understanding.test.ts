import { describe, expect, it, vi } from 'vitest'

import { understandWorkspaceRunInput } from '@/server/modules/workspace-agent/workspace-run-understanding'

describe('workspace-run-understanding', () => {
  it('trims task titles and returns validated understanding output', async () => {
    const runModel = vi.fn().mockResolvedValue({
      draftTasks: [
        {
          id: 'task_1',
          intent: 'create',
          target: 'todos',
          title: '  给产品经理发报价  ',
          confidence: 0.93,
          ambiguities: [],
          corrections: [],
          slots: {
            dueAt: '明天下午三点',
          },
        },
      ],
    })

    const result = await understandWorkspaceRunInput({
      normalized: {
        rawText: '帮我记个待办，明天下午三点发 prcing',
        normalizedText: '帮我记个待办，明天下午三点发 pricing',
        urls: [],
        separators: ['，'],
        typoCandidates: [
          {
            text: 'prcing',
            suggestion: 'pricing',
          },
        ],
        timeHints: ['明天下午三点'],
      },
      runModel,
    })

    expect(result).toEqual({
      rawInput: '帮我记个待办，明天下午三点发 prcing',
      normalizedInput: '帮我记个待办，明天下午三点发 pricing',
      draftTasks: [
        {
          id: 'task_1',
          intent: 'create',
          target: 'todos',
          title: '给产品经理发报价',
          confidence: 0.93,
          ambiguities: [],
          corrections: [],
          slots: {
            dueAt: '明天下午三点',
          },
        },
      ],
      corrections: ['prcing -> pricing'],
    })
  })

  it('rejects empty draft tasks', async () => {
    await expect(
      understandWorkspaceRunInput({
        normalized: {
          rawText: '记个待办',
          normalizedText: '记个待办',
          urls: [],
          separators: [],
          typoCandidates: [],
          timeHints: [],
        },
        runModel: vi.fn().mockResolvedValue({
          draftTasks: [],
        }),
      })
    ).rejects.toThrow('draftTasks must be non-empty')
  })

  it('rejects command prefixes as full titles', async () => {
    await expect(
      understandWorkspaceRunInput({
        normalized: {
          rawText: '记个待办',
          normalizedText: '记个待办',
          urls: [],
          separators: [],
          typoCandidates: [],
          timeHints: [],
        },
        runModel: vi.fn().mockResolvedValue({
          draftTasks: [
            {
              id: 'task_1',
              intent: 'create',
              target: 'todos',
              title: '记个待办',
              confidence: 0.81,
              ambiguities: [],
              corrections: [],
              slots: {},
            },
          ],
        }),
      })
    ).rejects.toThrow('task title cannot be only a command prefix')
  })

  it('rejects combined command prefixes as full titles', async () => {
    await expect(
      understandWorkspaceRunInput({
        normalized: {
          rawText: '帮我记一下',
          normalizedText: '帮我记一下',
          urls: [],
          separators: [],
          typoCandidates: [],
          timeHints: [],
        },
        runModel: vi.fn().mockResolvedValue({
          draftTasks: [
            {
              id: 'task_1',
              intent: 'create',
              target: 'todos',
              title: '帮我记一下',
              confidence: 0.81,
              ambiguities: [],
              corrections: [],
              slots: {},
            },
          ],
        }),
      })
    ).rejects.toThrow('task title cannot be only a command prefix')

    await expect(
      understandWorkspaceRunInput({
        normalized: {
          rawText: '帮我记个待办',
          normalizedText: '帮我记个待办',
          urls: [],
          separators: [],
          typoCandidates: [],
          timeHints: [],
        },
        runModel: vi.fn().mockResolvedValue({
          draftTasks: [
            {
              id: 'task_1',
              intent: 'create',
              target: 'todos',
              title: '帮我记个待办',
              confidence: 0.81,
              ambiguities: [],
              corrections: [],
              slots: {},
            },
          ],
        }),
      })
    ).rejects.toThrow('task title cannot be only a command prefix')
  })

  it('rejects whitespace-only titles after trimming', async () => {
    await expect(
      understandWorkspaceRunInput({
        normalized: {
          rawText: '帮我记一下',
          normalizedText: '帮我记一下',
          urls: [],
          separators: [],
          typoCandidates: [],
          timeHints: [],
        },
        runModel: vi.fn().mockResolvedValue({
          draftTasks: [
            {
              id: 'task_1',
              intent: 'create',
              target: 'todos',
              title: '   ',
              confidence: 0.81,
              ambiguities: [],
              corrections: [],
              slots: {},
            },
          ],
        }),
      })
    ).rejects.toThrow()
  })

  it('rejects tasks missing required fields', async () => {
    await expect(
      understandWorkspaceRunInput({
        normalized: {
          rawText: '帮我整理一下',
          normalizedText: '帮我整理一下',
          urls: [],
          separators: [],
          typoCandidates: [],
          timeHints: [],
        },
        runModel: vi.fn().mockResolvedValue({
          draftTasks: [
            {
              id: 'task_1',
              intent: 'summarize',
              target: 'mixed',
              title: '整理一下',
              confidence: 0.88,
              ambiguities: [],
              corrections: [],
            },
          ],
        }),
      })
    ).rejects.toThrow()
  })

  it('accepts compound input split into multiple draft tasks', async () => {
    const runModel = vi.fn().mockResolvedValue({
      draftTasks: [
        {
          id: 'task_1',
          intent: 'create',
          target: 'todos',
          title: '给产品经理发报价',
          confidence: 0.91,
          ambiguities: [],
          corrections: [],
          slots: {
            dueAt: '明天下午三点',
          },
        },
        {
          id: 'task_2',
          intent: 'create',
          target: 'bookmarks',
          title: '保存官网链接',
          confidence: 0.89,
          ambiguities: [],
          corrections: [],
          slots: {
            url: 'https://example.com/pricing',
          },
        },
      ],
    })

    const result = await understandWorkspaceRunInput({
      normalized: {
        rawText: '帮我记一下，明天下午三点给产品经理发报价；再保存 https://example.com/pricing',
        normalizedText:
          '帮我记一下，明天下午三点给产品经理发报价；再保存 https://example.com/pricing',
        urls: ['https://example.com/pricing'],
        separators: ['，', '；'],
        typoCandidates: [],
        timeHints: ['明天下午三点'],
      },
      runModel,
    })

    expect(result.draftTasks).toHaveLength(2)
    expect(result.draftTasks.map((task) => task.id)).toEqual(['task_1', 'task_2'])
  })

  it('accepts AI-friendly slotEntries and converts them to slots', async () => {
    const result = await understandWorkspaceRunInput({
      normalized: {
        rawText: '记一下：https://example.com 定价页',
        normalizedText: '记一下：https://example.com 定价页',
        urls: ['https://example.com'],
        separators: ['：'],
        typoCandidates: [],
        timeHints: [],
      },
      runModel: vi.fn().mockResolvedValue({
        draftTasks: [
          {
            id: 'task_1',
            intent: 'create',
            target: 'bookmarks',
            title: '定价页',
            confidence: 0.88,
            ambiguities: [],
            corrections: [],
            slotEntries: [
              { key: 'url', value: 'https://example.com' },
              { key: 'summary', value: '产品定价说明' },
            ],
          },
        ],
      }),
    })

    expect(result.draftTasks).toEqual([
      {
        id: 'task_1',
        intent: 'create',
        target: 'bookmarks',
        title: '定价页',
        confidence: 0.88,
        ambiguities: [],
        corrections: [],
        slots: {
          url: 'https://example.com',
          summary: '产品定价说明',
        },
      },
    ])
  })

  it('rejects duplicate keys in AI-friendly slotEntries', async () => {
    await expect(
      understandWorkspaceRunInput({
        normalized: {
          rawText: '记一下：https://example.com 定价页',
          normalizedText: '记一下：https://example.com 定价页',
          urls: ['https://example.com'],
          separators: ['：'],
          typoCandidates: [],
          timeHints: [],
        },
        runModel: vi.fn().mockResolvedValue({
          draftTasks: [
            {
              id: 'task_1',
              intent: 'create',
              target: 'bookmarks',
              title: '定价页',
              confidence: 0.88,
              ambiguities: [],
              corrections: [],
              slotEntries: [
                { key: 'url', value: 'https://example.com/a' },
                { key: 'url', value: 'https://example.com/b' },
              ],
            },
          ],
        }),
      })
    ).rejects.toThrow('slotEntries must not contain duplicate keys')
  })

  it('prefers slotEntries when both slots and slotEntries are present', async () => {
    const result = await understandWorkspaceRunInput({
      normalized: {
        rawText: '记一下：https://example.com 定价页',
        normalizedText: '记一下：https://example.com 定价页',
        urls: ['https://example.com'],
        separators: ['：'],
        typoCandidates: [],
        timeHints: [],
      },
      runModel: vi.fn().mockResolvedValue({
        draftTasks: [
          {
            id: 'task_1',
            intent: 'create',
            target: 'bookmarks',
            title: '定价页',
            confidence: 0.88,
            ambiguities: [],
            corrections: [],
            slots: {
              url: 'https://stale.example.com',
            },
            slotEntries: [
              { key: 'url', value: 'https://example.com' },
              { key: 'summary', value: '产品定价说明' },
            ],
          },
        ],
      }),
    })

    expect(result.draftTasks[0]?.slots).toEqual({
      url: 'https://example.com',
      summary: '产品定价说明',
    })
  })

  it('rejects intents outside the MVP action boundary', async () => {
    await expect(
      understandWorkspaceRunInput({
        normalized: {
          rawText: '帮我归档这条笔记',
          normalizedText: '帮我归档这条笔记',
          urls: [],
          separators: [],
          typoCandidates: [],
          timeHints: [],
        },
        runModel: vi.fn().mockResolvedValue({
          draftTasks: [
            {
              id: 'task_1',
              intent: 'archive',
              target: 'notes',
              title: '归档这条笔记',
              confidence: 0.74,
              ambiguities: [],
              corrections: [],
              slots: {},
            },
          ],
        }),
      })
    ).rejects.toThrow()
  })

  it('rejects unsupported intent explicitly', async () => {
    await expect(
      understandWorkspaceRunInput({
        normalized: {
          rawText: '帮我处理这个请求',
          normalizedText: '帮我处理这个请求',
          urls: [],
          separators: [],
          typoCandidates: [],
          timeHints: [],
        },
        runModel: vi.fn().mockResolvedValue({
          draftTasks: [
            {
              id: 'task_1',
              intent: 'unsupported',
              target: 'mixed',
              title: '处理这个请求',
              confidence: 0.4,
              ambiguities: ['intent not supported in MVP'],
              corrections: [],
              slots: {},
            },
          ],
        }),
      })
    ).rejects.toThrow()
  })

  it('rejects update tasks targeting non-todos assets', async () => {
    await expect(
      understandWorkspaceRunInput({
        normalized: {
          rawText: '更新这条笔记',
          normalizedText: '更新这条笔记',
          urls: [],
          separators: [],
          typoCandidates: [],
          timeHints: [],
        },
        runModel: vi.fn().mockResolvedValue({
          draftTasks: [
            {
              id: 'task_1',
              intent: 'update',
              target: 'notes',
              title: '更新这条笔记',
              confidence: 0.82,
              ambiguities: [],
              corrections: [],
              slots: {},
            },
          ],
        }),
      })
    ).rejects.toThrow()
  })

  it('rejects confidence values outside 0 to 1', async () => {
    await expect(
      understandWorkspaceRunInput({
        normalized: {
          rawText: '帮我记个待办',
          normalizedText: '帮我记个待办',
          urls: [],
          separators: [],
          typoCandidates: [],
          timeHints: [],
        },
        runModel: vi.fn().mockResolvedValue({
          draftTasks: [
            {
              id: 'task_1',
              intent: 'create',
              target: 'todos',
              title: '补充日报',
              confidence: 1.2,
              ambiguities: [],
              corrections: [],
              slots: {},
            },
          ],
        }),
      })
    ).rejects.toThrow()
  })

  it('rejects mixed target explicitly', async () => {
    await expect(
      understandWorkspaceRunInput({
        normalized: {
          rawText: '帮我整理这些内容',
          normalizedText: '帮我整理这些内容',
          urls: [],
          separators: [],
          typoCandidates: [],
          timeHints: [],
        },
        runModel: vi.fn().mockResolvedValue({
          draftTasks: [
            {
              id: 'task_1',
              intent: 'summarize',
              target: 'mixed',
              title: '整理这些内容',
              confidence: 0.9,
              ambiguities: [],
              corrections: [],
              slots: {},
            },
          ],
        }),
      })
    ).rejects.toThrow()
  })
})
