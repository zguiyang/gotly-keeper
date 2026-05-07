import path from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  deriveWorkspaceIntentEvalPrediction,
  loadWorkspaceIntentEvalDataset,
  summarizeWorkspaceIntentEvalRun,
} from '@/server/modules/workspace-agent/workspace-intent-eval'

import type { WorkspaceUnderstandingPreview } from '@/shared/workspace/workspace-run-protocol'

const fixturePath = path.resolve(process.cwd(), 'tests/fixtures/workspace/workspace-intent-eval.json')

function createUnderstandingPreview(
  overrides: Partial<WorkspaceUnderstandingPreview> = {}
): WorkspaceUnderstandingPreview {
  return {
    rawInput: '顺手帮我记一下：今天的观察',
    normalizedInput: '顺手帮我记一下：今天的观察',
    corrections: [],
    draftTasks: [
      {
        id: 'task_1',
        intent: 'create',
        target: 'notes',
        title: '今天的观察',
        confidence: 0.92,
        ambiguities: [],
        corrections: [],
        slots: {},
        hasRealContent: true,
      },
    ],
    ...overrides,
  }
}

describe('workspace-intent-eval', () => {
  it('loads and validates the capture intent dataset fixture', async () => {
    const dataset = await loadWorkspaceIntentEvalDataset(fixturePath)

    expect(dataset.version).toBe(1)
    expect(dataset.cases.length).toBeGreaterThanOrEqual(12)
    expect(dataset.cases[0]).toMatchObject({
      id: 'todo_explicit_01',
      bucket: 'explicit_command',
      expected: {
        actionClass: 'todo',
        intent: 'create',
        target: 'todos',
      },
    })
  })

  it('derives clarify prediction when understanding output stays ambiguous', () => {
    const prediction = deriveWorkspaceIntentEvalPrediction(
      createUnderstandingPreview({
        draftTasks: [
          {
            id: 'task_1',
            intent: 'create',
            target: 'mixed',
            title: '客户报价',
            confidence: 0.62,
            ambiguities: ['记录类型不明确'],
            corrections: [],
            slots: {},
            hasRealContent: true,
          },
        ],
      })
    )

    expect(prediction).toEqual({
      actionClass: 'clarify',
      intent: 'create',
      target: 'mixed',
      confidence: 0.62,
      reason: 'ambiguous_draft_task',
      taskCount: 1,
    })
  })

  it('summarizes bucket accuracy and confusion counts for eval results', () => {
    const summary = summarizeWorkspaceIntentEvalRun([
      {
        caseId: 'case_1',
        bucket: 'natural_capture',
        input: '顺手帮我记一下：今天的观察',
        expected: { actionClass: 'note', intent: 'create', target: 'notes' },
        actual: { actionClass: 'note', intent: 'create', target: 'notes', confidence: 0.9, reason: 'resolved_target', taskCount: 1 },
        matched: true,
      },
      {
        caseId: 'case_2',
        bucket: 'time_phrase_conflict',
        input: '下周那个客户报价你帮我整理一下',
        expected: { actionClass: 'clarify', intent: 'create', target: 'mixed' },
        actual: { actionClass: 'todo', intent: 'create', target: 'todos', confidence: 0.71, reason: 'resolved_target', taskCount: 1 },
        matched: false,
      },
      {
        caseId: 'case_3',
        bucket: 'time_phrase_conflict',
        input: '记一下：这个结论晚点同步给老板',
        expected: { actionClass: 'note', intent: 'create', target: 'notes' },
        actual: { actionClass: 'clarify', intent: 'create', target: 'mixed', confidence: 0.51, reason: 'ambiguous_draft_task', taskCount: 1 },
        matched: false,
      },
    ])

    expect(summary.overall).toEqual({
      total: 3,
      matched: 1,
      accuracy: 1 / 3,
    })
    expect(summary.byBucket.natural_capture).toEqual({
      total: 1,
      matched: 1,
      accuracy: 1,
    })
    expect(summary.byBucket.time_phrase_conflict).toEqual({
      total: 2,
      matched: 0,
      accuracy: 0,
    })
    expect(summary.confusionMatrix.clarify.todo).toBe(1)
    expect(summary.confusionMatrix.note.clarify).toBe(1)
    expect(summary.mismatches).toHaveLength(2)
  })
})
