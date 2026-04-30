'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import {
  fetchCurrentWorkspaceRun,
  streamWorkspaceRunEvents,
} from '@/client/workspace/workspace-run-events.client'
import {
  type WorkspaceInteraction,
  type WorkspaceInteractionResponse,
  type WorkspacePendingRunSnapshot,
  type WorkspacePlanPreview,
  type WorkspaceRunRequest,
  type WorkspaceRunResult,
  type WorkspaceRunStreamEvent,
  type WorkspaceUnderstandingPreview,
  workspacePlanPreviewSchema,
  workspacePreviewSchema,
  workspaceUnderstandingPreviewSchema,
} from '@/shared/workspace/workspace-run-protocol'

export type WorkspaceRunUiState = {
  status: 'idle' | 'streaming' | 'awaiting_user' | 'success' | 'error'
  runId?: string
  interaction?: WorkspaceInteraction
  timeline: WorkspaceRunStreamEvent[]
  result: WorkspaceRunResult | null
  understandingPreview: WorkspaceUnderstandingPreview | null
  planPreview: WorkspacePlanPreview | null
  correctionNotes: string[]
  errorMessage: string | null
  startedAt: number | null
  endedAt: number | null
}

const INITIAL_RUN_STATE: WorkspaceRunUiState = {
  status: 'idle',
  timeline: [],
  result: null,
  understandingPreview: null,
  planPreview: null,
  correctionNotes: [],
  errorMessage: null,
  startedAt: null,
  endedAt: null,
}

function parseRunStartedAt(runId: string) {
  const [, startedAtText] = runId.split('_')
  const startedAt = Number.parseInt(startedAtText ?? '', 10)

  return Number.isFinite(startedAt) ? startedAt : Date.now()
}

function extractSnapshotPreviewState(
  snapshot: Pick<
    WorkspacePendingRunSnapshot,
    'preview' | 'understandingPreview' | 'correctionNotes'
  >
) {
  return {
    understandingPreview:
      snapshot.preview?.understanding ?? snapshot.understandingPreview,
    planPreview: snapshot.preview?.plan ?? null,
    correctionNotes: snapshot.correctionNotes,
  }
}

function extractEventPreviewState(
  event: WorkspaceRunStreamEvent
): Partial<
  Pick<
    WorkspaceRunUiState,
    'understandingPreview' | 'planPreview' | 'correctionNotes'
  >
> {
  if (event.type !== 'phase_completed') {
    return {}
  }

  if (event.phase === 'understand') {
    const parsed = workspaceUnderstandingPreviewSchema.safeParse(event.output)
    if (parsed.success) {
      return {
        understandingPreview: parsed.data,
        correctionNotes: parsed.data.corrections,
      }
    }
  }

  if (event.phase === 'preview') {
    const parsed = workspacePreviewSchema.safeParse(event.output)
    if (parsed.success) {
      return {
        understandingPreview: parsed.data.understanding ?? null,
        planPreview: parsed.data.plan ?? null,
        correctionNotes: parsed.data.understanding?.corrections ?? [],
      }
    }
  }

  if (event.phase === 'plan') {
    const parsed = workspacePlanPreviewSchema.safeParse(event.output)
    if (parsed.success) {
      return {
        planPreview: parsed.data,
      }
    }
  }

  return {}
}

export function useWorkspaceStream(options: {
  onResult?: (result: WorkspaceRunResult) => void
} = {}) {
  const [state, setState] = useState<WorkspaceRunUiState>({
    ...INITIAL_RUN_STATE,
  })
  const abortControllerRef = useRef<AbortController | null>(null)
  const requestIdRef = useRef(0)
  const runStartedAtRef = useRef<number | null>(null)

  const loadCurrentAwaitingRun = useCallback(async () => {
    try {
      const result = await fetchCurrentWorkspaceRun()
      if (result.ok && result.run) {
        const startedAt = parseRunStartedAt(result.run.runId)
        runStartedAtRef.current = startedAt

        setState({
          status: 'awaiting_user',
          runId: result.run.runId,
          interaction: result.run.interaction,
          timeline: result.run.timeline,
          result: null,
          ...extractSnapshotPreviewState(result.run),
          errorMessage: null,
          startedAt,
          endedAt: Date.now(),
        })
      }
    } catch {
      // silently ignore rehydration errors
    }
  }, [])

  useEffect(() => {
    loadCurrentAwaitingRun()
  }, [loadCurrentAwaitingRun])

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  const runRequest = useCallback(
    async (request: WorkspaceRunRequest) => {
      requestIdRef.current += 1
      const requestId = requestIdRef.current
      abortControllerRef.current?.abort()
      const abortController = new AbortController()
      abortControllerRef.current = abortController
      const startedAt = request.kind === 'resume'
        ? (runStartedAtRef.current ?? state.startedAt ?? Date.now())
        : Date.now()

      runStartedAtRef.current = startedAt

      setState({
        status: 'streaming',
        timeline: [],
        result: null,
        understandingPreview: null,
        planPreview: null,
        correctionNotes: [],
        errorMessage: null,
        startedAt,
        endedAt: null,
      })

      try {
        await streamWorkspaceRunEvents(
          request,
          {
            onEvent: (event: WorkspaceRunStreamEvent) => {
              if (
                requestIdRef.current !== requestId ||
                abortController.signal.aborted
              ) {
                return
              }

              switch (event.type) {
                case 'phase_started':
                case 'phase_completed':
                  setState((current) => ({
                    ...current,
                    timeline: [...current.timeline, event],
                    ...extractEventPreviewState(event),
                  }))
                  break

                case 'tool_call_started':
                case 'tool_call_completed':
                  setState((current) => ({
                    ...current,
                    timeline: [...current.timeline, event],
                  }))
                  break

                case 'awaiting_user':
                  setState((current) => ({
                    status: 'awaiting_user',
                    runId: event.interaction.runId,
                    interaction: event.interaction,
                    timeline: [...current.timeline, event],
                    result: null,
                    understandingPreview: current.understandingPreview,
                    planPreview: current.planPreview,
                    correctionNotes: current.correctionNotes,
                    errorMessage: null,
                    startedAt: current.startedAt,
                    endedAt: Date.now(),
                  }))
                  break

                case 'run_completed':
                  setState((current) => ({
                    status: 'success',
                    timeline: [...current.timeline, event],
                    result: event.result,
                    understandingPreview:
                      event.result.preview?.understanding ??
                      current.understandingPreview,
                    planPreview:
                      event.result.preview?.plan ?? current.planPreview,
                    correctionNotes:
                      event.result.preview?.understanding?.corrections ??
                      current.correctionNotes,
                    errorMessage: null,
                    startedAt: current.startedAt,
                    endedAt: Date.now(),
                  }))
                  options.onResult?.(event.result)
                  break

                case 'run_failed':
                  setState((current) => ({
                    status: 'error',
                    timeline: [...current.timeline, event],
                    result: null,
                    understandingPreview: current.understandingPreview,
                    planPreview: current.planPreview,
                    correctionNotes: current.correctionNotes,
                    errorMessage: event.error.message,
                    startedAt: current.startedAt,
                    endedAt: Date.now(),
                  }))
                  break
              }
            },
            onError: (error: Error) => {
              if (
                requestIdRef.current !== requestId ||
                abortController.signal.aborted
              ) {
                return
              }
              setState((current) => ({
                ...current,
                status: 'error',
                timeline: [],
                result: null,
                errorMessage: error.message,
                endedAt: Date.now(),
              }))
            },
          },
          { signal: abortController.signal }
        )
      } catch (error) {
        if (abortController.signal.aborted || requestIdRef.current !== requestId) {
          return
        }

        setState((current) => ({
          ...current,
          status: 'error',
          timeline: [],
          result: null,
          errorMessage:
            error instanceof Error ? error.message : '处理失败，请重试。',
          endedAt: Date.now(),
        }))
      } finally {
        if (abortControllerRef.current === abortController) {
          abortControllerRef.current = null
        }
      }
    },
    [options, state.startedAt]
  )

  const submitInput = useCallback(
    async (text: string) => {
      await runRequest({ kind: 'input', text })
    },
    [runRequest]
  )

  const triggerQuickAction = useCallback(
    async (
      action: Extract<WorkspaceRunRequest, { kind: 'quick-action' }>['action']
    ) => {
      await runRequest({ kind: 'quick-action', action })
    },
    [runRequest]
  )

  const resumeInteraction = useCallback(
    async (response: WorkspaceInteractionResponse) => {
      if (!state.runId || !state.interaction) {
        setState((current) => ({
          ...current,
          status: 'error',
          errorMessage: '没有可继续的运行。',
        }))
        return
      }

      await runRequest({
        kind: 'resume',
        runId: state.runId,
        interactionId: state.interaction.id,
        response,
      })
    },
    [runRequest, state.runId, state.interaction]
  )

  const resetRun = useCallback(() => {
    runStartedAtRef.current = null
    setState({ ...INITIAL_RUN_STATE })
  }, [])

  return {
    state,
    submitInput,
    triggerQuickAction,
    resumeInteraction,
    resetRun,
  }
}
