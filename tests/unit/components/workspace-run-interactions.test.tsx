// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { CandidatePicker } from '@/components/workspace/candidate-picker'
import { DraftTaskEditor } from '@/components/workspace/draft-task-editor'
import { PlanPreviewCard } from '@/components/workspace/plan-preview-card'
import { RunTimeline } from '@/components/workspace/run-timeline'
import { SlotClarificationForm } from '@/components/workspace/slot-clarification-form'
import { UnderstandingPreview } from '@/components/workspace/understanding-preview'
import { WorkspaceRunResultPanel } from '@/components/workspace/workspace-run-result-panel'

import type {
  ClarifySlotsInteraction,
  ConfirmPlanInteraction,
  EditDraftTasksInteraction,
  SelectCandidateInteraction,
  WorkspaceRunResult,
  WorkspaceRunStreamEvent,
  WorkspaceUnderstandingPreview,
} from '@/shared/workspace/workspace-run-protocol'

afterEach(() => {
  cleanup()
})

describe('CandidatePicker', () => {
  const mockInteraction: SelectCandidateInteraction = {
    runId: 'run_1',
    id: 'interaction_1',
    type: 'select_candidate',
    target: 'todo',
    message: '找到多个待办，请选择一个',
    actions: ['select', 'skip', 'cancel'],
    candidates: [
      { id: 'todo_1', label: '发报价给老王', reason: '主题匹配' },
      { id: 'todo_2', label: '整理报价模板', reason: '关键词匹配' },
    ],
  }

  it('renders candidates and action buttons', () => {
    const onSubmit = () => {}
    render(<CandidatePicker interaction={mockInteraction} onSubmit={onSubmit} />)

    expect(screen.getByText('发报价给老王')).toBeTruthy()
    expect(screen.getByText('主题匹配')).toBeTruthy()
    expect(screen.getByRole('button', { name: '选择' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '跳过' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '取消' })).toBeTruthy()
  })

  it('calls onSubmit with select action when candidate is clicked', () => {
    let submittedResponse: unknown = null
    const onSubmit = (response: unknown) => {
      submittedResponse = response
    }

    render(<CandidatePicker interaction={mockInteraction} onSubmit={onSubmit} />)

    const todo1Card = screen.getByText('发报价给老王').closest('div[class*="cursor-pointer"]')
    if (todo1Card) {
      fireEvent.click(todo1Card)
    }

    const selectButton = screen.getByRole('button', { name: '选择' })
    selectButton.click()

    expect(submittedResponse).toMatchObject({
      type: 'select_candidate',
      action: 'select',
      candidateId: 'todo_1',
    })
  })
})

describe('SlotClarificationForm', () => {
  const mockInteraction: ClarifySlotsInteraction = {
    runId: 'run_1',
    id: 'interaction_1',
    type: 'clarify_slots',
    message: '请补充以下信息',
    actions: ['submit', 'cancel'],
    fields: [
      { key: 'dueDate', label: '截止日期', required: true, placeholder: '输入日期' },
      { key: 'note', label: '备注', required: false, placeholder: '可选备注' },
    ],
  }

  it('renders form fields and action buttons', () => {
    const onSubmit = () => {}
    render(<SlotClarificationForm interaction={mockInteraction} onSubmit={onSubmit} />)

    expect(screen.getByPlaceholderText('输入日期')).toBeTruthy()
    expect(screen.getByPlaceholderText('可选备注')).toBeTruthy()
    expect(screen.getByRole('button', { name: '提交' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '取消' })).toBeTruthy()
  })

  it('calls onSubmit with submit action and values', () => {
    let submittedResponse: unknown = null
    const onSubmit = (response: unknown) => {
      submittedResponse = response
    }

    render(<SlotClarificationForm interaction={mockInteraction} onSubmit={onSubmit} />)

    const dueDateInput = screen.getByPlaceholderText('输入日期')
    fireEvent.change(dueDateInput, { target: { value: '2026-05-01' } })

    const submitButton = screen.getByRole('button', { name: '提交' })
    submitButton.click()

    expect(submittedResponse).toMatchObject({
      type: 'clarify_slots',
      action: 'submit',
      values: expect.objectContaining({
        dueDate: '2026-05-01',
      }),
    })
  })
})

describe('DraftTaskEditor', () => {
  const mockInteraction: EditDraftTasksInteraction = {
    runId: 'run_1',
    id: 'interaction_1',
    type: 'edit_draft_tasks',
    message: '请编辑任务列表',
    actions: ['save', 'cancel'],
    tasks: [
      {
        id: 'draft_1',
        intent: 'create',
        target: 'notes',
        title: '首页文案要更轻',
        confidence: 0.88,
        ambiguities: [],
        corrections: [],
        slots: {},
      },
      {
        id: 'draft_2',
        intent: 'create',
        target: 'todos',
        title: '给 Joy 看一版',
        confidence: 0.86,
        ambiguities: [],
        corrections: [],
        slots: { dueText: '周五' },
      },
    ],
  }

  it('renders editable task list without local action buttons', () => {
    render(<DraftTaskEditor interaction={mockInteraction} />)

    expect(screen.getByDisplayValue('首页文案要更轻')).toBeTruthy()
    expect(screen.getByDisplayValue('给 Joy 看一版')).toBeTruthy()
    expect(screen.queryByRole('button', { name: '保存并继续' })).toBeNull()
    expect(screen.queryByRole('button', { name: '取消' })).toBeNull()
  })
})

describe('PlanPreviewCard', () => {
  const mockInteraction: ConfirmPlanInteraction = {
    runId: 'run_1',
    id: 'interaction_1',
    type: 'confirm_plan',
    message: '请确认以下计划',
    actions: ['confirm', 'edit', 'cancel'],
    plan: {
      summary: '将创建 1 个待办',
      steps: [
        { id: 'step_1', toolName: 'create_todo', title: '发报价', preview: '创建待办：发报价' },
      ],
    },
  }

  it('renders plan preview without local action buttons', () => {
    render(<PlanPreviewCard interaction={mockInteraction} />)

    expect(screen.getByText('发报价')).toBeTruthy()
    expect(screen.getByText('待你确认')).toBeTruthy()
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.queryByText('编辑（即将支持）')).toBeNull()
  })

  it('renders plan steps as a section list instead of cards', () => {
    const { container } = render(<PlanPreviewCard interaction={mockInteraction} />)
    expect(container.querySelector('section')).toBeTruthy()
    expect(container.querySelector('ol')).toBeTruthy()
    expect(container.querySelector('[class*="group/card"]')).toBeNull()
  })
})

describe('RunTimeline', () => {
  const mockTimeline: WorkspaceRunStreamEvent[] = [
    { type: 'phase_started', phase: 'normalize' },
    { type: 'phase_completed', phase: 'normalize' },
    { type: 'phase_started', phase: 'understand' },
    { type: 'phase_completed', phase: 'understand' },
    { type: 'phase_started', phase: 'plan' },
    { type: 'phase_completed', phase: 'plan' },
    { type: 'tool_call_started', toolName: 'create_todo', preview: '创建待办：发报价' },
    { type: 'tool_call_completed', toolName: 'create_todo', result: { ok: true } },
    {
      type: 'run_completed',
      result: {
        summary: '执行了 1/1 个步骤',
        answer: '已创建待办：发报价。',
        preview: null,
      },
    },
  ]

  it('renders all timeline events', () => {
    render(<RunTimeline timeline={mockTimeline} />)

    expect(screen.getByText('开始: 标准化')).toBeTruthy()
    expect(screen.getByText('开始: 理解')).toBeTruthy()
    expect(screen.getByText('开始: 计划')).toBeTruthy()
    expect(screen.getByText('开始: 创建待办')).toBeTruthy()
    expect(screen.getByText('完成: 标准化')).toBeTruthy()
    expect(screen.getByText('完成: 已生成最终结果')).toBeTruthy()
    expect(screen.getByText('已创建待办：发报价。')).toBeTruthy()
  })
})

describe('UnderstandingPreview', () => {
  const mockPreview: WorkspaceUnderstandingPreview = {
    rawInput: '记一下首页文案要更轻，周五提醒我给 Joy 看一版',
    normalizedInput: '记一下首页文案要更轻，周五提醒我给 Joy 看一版',
    draftTasks: [
      {
        id: 'draft_1',
        intent: 'create',
        target: 'notes',
        title: '首页文案要更轻',
        confidence: 0.88,
        ambiguities: [],
        corrections: [],
        slots: {},
      },
      {
        id: 'draft_2',
        intent: 'create',
        target: 'todos',
        title: '给 Joy 看一版',
        confidence: 0.86,
        ambiguities: [],
        corrections: [],
        slots: { dueText: '周五' },
      },
    ],
    corrections: [],
  }

  it('renders understanding preview with task list', () => {
    render(<UnderstandingPreview understandingPreview={mockPreview} />)

    expect(screen.getByText('首页文案要更轻')).toBeTruthy()
    expect(screen.getByText('给 Joy 看一版')).toBeTruthy()
    expect(screen.getByText('原始输入')).toBeTruthy()
  })
})

describe('WorkspaceRunResultPanel', () => {
  const mockResult: WorkspaceRunResult = {
    summary: '处理完成',
    preview: null,
    data: null,
  }

  it('renders result with assistant text', () => {
    render(<WorkspaceRunResultPanel result={mockResult} assistantText="已创建待办：发报价" />)

    expect(screen.getByText('已创建待办：发报价')).toBeTruthy()
    expect(screen.getByText('处理完成')).toBeTruthy()
  })

  it('renders error result', () => {
    const errorResult: WorkspaceRunResult = {
      summary: '处理失败',
      preview: null,
      data: null,
    }

    render(<WorkspaceRunResultPanel result={errorResult} assistantText={null} />)

    expect(screen.getByText('处理失败')).toBeTruthy()
  })
})
