import { describe, expect, it } from 'vitest'

import { findWorkspaceBookmarkDuplicateCandidates } from '@/server/modules/workspace-agent/workspace-run-duplicates'

describe('workspace-run-duplicates', () => {
  it('detects repeated note creates within the same batch before execution', async () => {
    const result = await findWorkspaceBookmarkDuplicateCandidates({
      userId: 'user_123',
      draftTasks: [
        {
          id: 'draft_1',
          intent: 'create',
          target: 'notes',
          title: 'RQA0507R7H 这个结论要同步一下',
          cleanTitle: 'RQA0507R7H 这个结论要同步一下',
          cleanContent: 'RQA0507R7H 这个结论要同步一下',
          confidence: 0.94,
          ambiguities: [],
          corrections: [],
          slots: {
            content: 'RQA0507R7H 这个结论要同步一下',
          },
        },
        {
          id: 'draft_2',
          intent: 'create',
          target: 'notes',
          title: 'RQA0507R7H 这个结论要同步一下',
          cleanTitle: 'RQA0507R7H 这个结论要同步一下',
          cleanContent: 'RQA0507R7H 这个结论要同步一下',
          confidence: 0.93,
          ambiguities: [],
          corrections: [],
          slots: {
            content: 'RQA0507R7H 这个结论要同步一下',
          },
        },
      ],
    })

    expect(result).toEqual([
      {
        stepId: 'step_2',
        target: 'note',
        duplicates: [
          {
            id: 'draft_1',
            label: 'RQA0507R7H 这个结论要同步一下',
            preview: 'RQA0507R7H 这个结论要同步一下',
            type: 'note',
            reason: '与本次输入中的上一条内容重复',
          },
        ],
      },
    ])
  })
})
