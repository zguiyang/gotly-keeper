// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { WorkspaceClient } from '@/components/workspace/workspace-client'

vi.mock('@/hooks/workspace/use-workspace-stream', () => ({
  useWorkspaceStream: () => ({
    state: {
      status: 'idle',
      timeline: [],
      result: null,
      understandingPreview: null,
      planPreview: null,
      correctionNotes: [],
      errorMessage: null,
      startedAt: null,
      endedAt: null,
    },
    submitInput: vi.fn(),
    resetRun: vi.fn(),
    resumeInteraction: vi.fn(),
  }),
}))

describe('workspace-client', () => {
  it('disables send when the input is empty or whitespace only', async () => {
    const user = userEvent.setup()

    render(<WorkspaceClient recentAssets={[]} />)

    const input = screen.getByRole('textbox', { name: '输入内容或搜索知识库' })
    const button = screen.getByRole('button', { name: /发送/i })

    expect(button).toHaveProperty('disabled', true)

    await user.type(input, '   ')
    expect(button).toHaveProperty('disabled', true)

    await user.clear(input)
    await user.type(input, '记个待办：给客户发报价')
    expect(button).toHaveProperty('disabled', false)
  })
})
