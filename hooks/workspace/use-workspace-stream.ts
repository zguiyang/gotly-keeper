'use client'

import { useCallback, useState } from 'react'
import { useEffect, useRef } from 'react'

import { streamWorkspaceRun } from '@/client/workspace/workspace-run-stream.client'

import type {
  WorkspaceRunApiPhase,
  WorkspaceRunApiResponse,
  WorkspaceRunRequest,
} from '@/shared/workspace/workspace-runner.types'

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

const INITIAL_RUN_STATE: WorkspaceRunUiState = {
  status: 'idle',
  assistantText: null,
  phases: [],
  result: null,
  errorMessage: null,
}

function mergePhase(
  phases: WorkspaceRunApiPhase[],
  nextPhase: WorkspaceRunApiPhase
) {
  const phaseIndex = phases.findIndex((phase) => phase.phase === nextPhase.phase)

  if (phaseIndex === -1) {
    return [...phases, nextPhase]
  }

  return phases.map((phase, index) => (
    index === phaseIndex ? nextPhase : phase
  ))
}

export function useWorkspaceStream(options: {
  onResult?: (result: WorkspaceRunApiResponse['data']) => void
} = {}) {
  const [state, setState] = useState<WorkspaceRunUiState>({
    ...INITIAL_RUN_STATE,
  })
  const abortControllerRef = useRef<AbortController | null>(null)
  const requestIdRef = useRef(0)

  useEffect(() => () => {
    abortControllerRef.current?.abort()
  }, [])

  const runRequest = useCallback(
    async (request: WorkspaceRunRequest) => {
      requestIdRef.current += 1
      const requestId = requestIdRef.current
      abortControllerRef.current?.abort()
      const abortController = new AbortController()
      abortControllerRef.current = abortController

      setState({
        status: 'streaming',
        assistantText: null,
        phases: INITIAL_PHASES,
        result: null,
        errorMessage: null,
      })

      try {
        const runState: {
          finalResponse?: WorkspaceRunApiResponse
          streamError?: Error
        } = {}

        await streamWorkspaceRun(request, {
          onEvent: (event) => {
            if (requestIdRef.current !== requestId || abortController.signal.aborted) {
              return
            }

            if (event.type === 'phase') {
              setState((current) => ({
                ...current,
                phases: mergePhase(current.phases, event.phase),
              }))
              return
            }

            if (event.type === 'error') {
              runState.streamError = new Error(event.message)
              return
            }

            runState.finalResponse = event.response
            setState({
              status: event.response.ok ? 'success' : 'error',
              assistantText: event.response.answer,
              phases: event.response.phases,
              result: event.response.data,
              errorMessage:
                event.response.ok || event.response.data.kind !== 'error'
                  ? null
                  : event.response.data.message,
            })
          },
        }, { signal: abortController.signal })

        if (runState.streamError) {
          throw runState.streamError
        }

        if (requestIdRef.current !== requestId || abortController.signal.aborted) {
          return
        }

        if (!runState.finalResponse) {
          throw new Error('服务端没有返回处理结果，请重试。')
        }

        options.onResult?.(runState.finalResponse.data)
      } catch (error) {
        if (abortController.signal.aborted || requestIdRef.current !== requestId) {
          return
        }

        setState({
          status: 'error',
          assistantText: null,
          phases: [],
          result: null,
          errorMessage: error instanceof Error ? error.message : '处理失败，请重试。',
        })
      } finally {
        if (abortControllerRef.current === abortController) {
          abortControllerRef.current = null
        }
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

  const resetRun = useCallback(() => {
    setState({ ...INITIAL_RUN_STATE })
  }, [])

  return {
    state,
    submitInput,
    triggerQuickAction,
    resetRun,
  }
}
