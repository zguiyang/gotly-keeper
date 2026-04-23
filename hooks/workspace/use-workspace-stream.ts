'use client'

import { useCallback, useState } from 'react'

import type {
  WorkspaceRunApiPhase,
  WorkspaceRunApiResponse,
  WorkspaceRunRequest,
} from '@/shared/workspace/workspace-runner.types'
import type { Dispatch, SetStateAction } from 'react'

export type WorkspaceRunUiState = {
  status: 'idle' | 'streaming' | 'success' | 'error'
  assistantText: string | null
  phases: WorkspaceRunApiPhase[]
  result: WorkspaceRunApiResponse['data'] | null
  errorMessage: string | null
}

const INITIAL_PHASES: WorkspaceRunApiPhase[] = [
  { phase: 'parse', status: 'active', message: '正在理解请求' },
  { phase: 'route', status: 'skipped', message: '等待选择操作' },
  { phase: 'execute', status: 'skipped', message: '等待执行工具' },
  { phase: 'compose', status: 'skipped', message: '等待整理结果' },
]

const PLAYBACK_PHASES: WorkspaceRunApiPhase[] = [
  { phase: 'parse', status: 'active', message: '正在理解请求' },
  { phase: 'route', status: 'active', message: '正在选择操作' },
  { phase: 'execute', status: 'active', message: '正在执行工具' },
  { phase: 'compose', status: 'active', message: '正在整理结果' },
]

const DEFAULT_PHASE_PLAYBACK_DELAY_MS = 520

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function buildPlaybackPhases(activeIndex: number) {
  return PLAYBACK_PHASES.map((phase, index) => {
    if (index < activeIndex) {
      return {
        ...phase,
        status: 'done' as const,
      }
    }

    if (index === activeIndex) {
      return phase
    }

    return {
      ...INITIAL_PHASES[index],
      status: 'skipped' as const,
    }
  })
}

async function playMinimumPhaseSequence(
  setState: Dispatch<SetStateAction<WorkspaceRunUiState>>,
  delayMs: number
) {
  if (delayMs <= 0) {
    return
  }

  for (let index = 1; index < PLAYBACK_PHASES.length; index++) {
    await sleep(delayMs)
    setState((current) => {
      if (current.status !== 'streaming') {
        return current
      }

      return {
        ...current,
        phases: buildPlaybackPhases(index),
      }
    })
  }
}

async function postWorkspaceRun(body: WorkspaceRunRequest) {
  const response = await fetch('/api/workspace/run', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(payload?.error ?? '处理失败，请重试。')
  }

  return (await response.json()) as WorkspaceRunApiResponse
}

export function useWorkspaceStream(options: {
  onResult?: (result: WorkspaceRunApiResponse['data']) => void
  phasePlaybackDelayMs?: number
} = {}) {
  const [state, setState] = useState<WorkspaceRunUiState>({
    status: 'idle',
    assistantText: null,
    phases: [],
    result: null,
    errorMessage: null,
  })

  const runRequest = useCallback(
    async (request: WorkspaceRunRequest) => {
      setState({
        status: 'streaming',
        assistantText: null,
        phases: INITIAL_PHASES,
        result: null,
        errorMessage: null,
      })

      try {
        const [responseResult] = await Promise.allSettled([
          postWorkspaceRun(request),
          playMinimumPhaseSequence(
            setState,
            options.phasePlaybackDelayMs ?? DEFAULT_PHASE_PLAYBACK_DELAY_MS
          ),
        ])

        if (responseResult.status === 'rejected') {
          throw responseResult.reason
        }

        const response = responseResult.value

        setState({
          status: response.ok ? 'success' : 'error',
          assistantText: response.answer,
          phases: response.phases,
          result: response.data,
          errorMessage: response.ok || response.data.kind !== 'error' ? null : response.data.message,
        })

        options.onResult?.(response.data)
      } catch (error) {
        setState({
          status: 'error',
          assistantText: null,
          phases: [],
          result: null,
          errorMessage: error instanceof Error ? error.message : '处理失败，请重试。',
        })
      }
    },
    [options]
  )

  const submitInput = useCallback(
    async (text: string) => {
      await runRequest({ kind: 'input', text })
    },
    [runRequest]
  )

  const triggerQuickAction = useCallback(
    async (action: Extract<WorkspaceRunRequest, { kind: 'quick-action' }>['action']) => {
      await runRequest({ kind: 'quick-action', action })
    },
    [runRequest]
  )

  return {
    state,
    submitInput,
    triggerQuickAction,
  }
}
