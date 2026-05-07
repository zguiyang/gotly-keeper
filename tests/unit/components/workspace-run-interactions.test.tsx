// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { CandidatePicker } from '@/components/workspace/candidate-picker'
import { PlanPreviewCard } from '@/components/workspace/plan-preview-card'
import { SlotClarificationForm } from '@/components/workspace/slot-clarification-form'

import type {
  ClarifySlotsInteraction,
  ConfirmPlanInteraction,
  SelectCandidateInteraction,
} from '@/shared/workspace/workspace-run-protocol'

afterEach(() => {
  cleanup()
})

describe('CandidatePicker', () => {
  const interaction: SelectCandidateInteraction = {
    runId: 'run_1',
    id: 'interaction_1',
    type: 'select_candidate',
    target: 'todo',
    message: '请选择要更新的待办',
    actions: ['select', 'skip', 'cancel'],
    candidates: [
      { id: 'todo_1', label: '发报价给老王', reason: '主题匹配' },
      { id: 'todo_2', label: '整理报价模板', reason: '关键词匹配' },
    ],
  }

  it('renders candidates and notifies parent on selection', () => {
    let selected: string | null = null

    render(
      <CandidatePicker
        interaction={interaction}
        selectedId={null}
        onSelect={(candidateId) => {
          selected = candidateId
        }}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /整理报价模板/ }))
    expect(selected).toBe('todo_2')
  })
})

describe('SlotClarificationForm', () => {
  const interaction: ClarifySlotsInteraction = {
    runId: 'run_1',
    id: 'interaction_1',
    type: 'clarify_slots',
    message: '请补充以下信息',
    actions: ['submit', 'cancel'],
    fields: [{ key: 'details', label: '具体内容', required: true, input: 'text', placeholder: '输入内容' }],
  }

  it('submits current field values through the form handler', () => {
    let submitted: unknown = null

    render(
      <SlotClarificationForm
        interaction={interaction}
        formId="clarify-form"
        onSubmit={(response) => {
          submitted = response
        }}
      />
    )

    fireEvent.change(screen.getByPlaceholderText('输入内容'), {
      target: { value: '普通用户希望一句话直接保存' },
    })
    fireEvent.submit(document.getElementById('clarify-form')!)

    expect(submitted).toMatchObject({
      type: 'clarify_slots',
      action: 'submit',
      values: {
        details: '普通用户希望一句话直接保存',
      },
    })
  })
})

describe('PlanPreviewCard', () => {
  const interaction: ConfirmPlanInteraction = {
    runId: 'run_1',
    id: 'interaction_1',
    type: 'confirm_plan',
    message: '请确认以下计划',
    actions: ['confirm', 'cancel'],
    plan: {
      summary: '将分别保存 2 条内容',
      steps: [
        { id: 'step_1', toolName: 'create_todo', title: '创建待办', preview: '创建待办：发报价' },
        { id: 'step_2', toolName: 'create_note', title: '创建笔记', preview: '创建笔记：一句话直接保存' },
      ],
    },
  }

  it('renders plan steps without local action buttons', () => {
    render(<PlanPreviewCard interaction={interaction} />)

    expect(screen.getAllByText('创建待办').length).toBeGreaterThan(0)
    expect(screen.getAllByText('创建笔记').length).toBeGreaterThan(0)
    expect(screen.queryByRole('button')).toBeNull()
  })
})
