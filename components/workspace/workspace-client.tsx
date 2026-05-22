'use client'

import { Loader2, SendHorizontal, Sparkles } from 'lucide-react'
import { AnimatePresence } from 'motion/react'
import { useCallback, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { assetTypePresentation, getAssetLocaleKey } from '@/config/ui/asset-presentation'
import { useTranslations } from '@/hooks/use-locale'
import { useWorkspaceStream } from '@/hooks/workspace/use-workspace-stream'
import { formatAbsoluteTime } from '@/shared/time/formatters'

import { RecentItem } from './workspace-result-panels'
import { WorkspaceRunPanel } from './workspace-run-panel'

import type { AssetListItem } from '@/shared/assets/assets.types'
import type {
  WorkspaceRunResult,
  WorkspaceRunToolResult,
} from '@/shared/workspace/workspace-run-protocol'

function collectCreatedItemsFromToolResult(result: WorkspaceRunToolResult | null | undefined) {
  if (!result?.ok || result.action !== 'create' || !result.item) {
    return []
  }

  return [result.item]
}

function QuickInputSuggestions({
  onSuggestionClick,
  hidden,
  label,
  items,
}: {
  onSuggestionClick: (text: string) => void
  hidden: boolean
  label: string
  items: string[]
}) {
  return (
    <div
      className={`mt-3 flex items-center gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${
        hidden ? 'hidden' : ''
      }`}
    >
      <span className="shrink-0 text-[11px] font-semibold tracking-[0.12em] text-on-surface-variant/75 uppercase">
        {label}
      </span>
      {items.map((suggestion, index) => (
        <button
          type="button"
          key={index}
          onClick={() => onSuggestionClick(suggestion)}
          className="group shrink-0 rounded-full border border-border/10 bg-surface-container-lowest/80 px-3 py-2 text-left shadow-[var(--shadow-elevation-1)] transition-colors duration-150 hover:border-primary/20 hover:bg-primary/4"
        >
          <span className="text-[13px] text-on-surface-variant/80 transition-colors duration-150 group-hover:text-on-surface">
            {suggestion}
          </span>
        </button>
      ))}
    </div>
  )
}

export function WorkspaceClient({
  recentAssets,
}: {
  recentAssets: AssetListItem[]
}) {
  const t = useTranslations('workspace.client')
  const tRun = useTranslations('workspace.runPanel')
  const tCommon = useTranslations('common')
  const [inputValue, setInputValue] = useState('')
  const [recentItems, setRecentItems] = useState(recentAssets)
  const isSubmittingRef = useRef(false)

  const handleWorkspaceResult = useCallback((result: WorkspaceRunResult) => {
    const createdItems = Array.isArray(result.stepResults)
      ? result.stepResults.flatMap((stepResult) =>
          collectCreatedItemsFromToolResult(stepResult.result)
        )
      : collectCreatedItemsFromToolResult(result.data ?? null)

    if (createdItems.length === 0) {
      return
    }

    setRecentItems((items) => [
      ...[...createdItems].reverse(),
      ...items.filter((item) => !createdItems.some((createdItem) => createdItem.id === item.id)),
    ].slice(0, 10))
  }, [])

  const {
    state,
    pendingRun,
    pendingRunLoading,
    pendingRunDismissing,
    submitInput,
    cancelRun,
    resetRun,
    resumeInteraction,
    restorePendingRun,
    dismissPendingRun,
  } = useWorkspaceStream({ onResult: handleWorkspaceResult })
  const hasRunPanel = state.status !== 'idle'
  const elapsedMs = state.startedAt
    ? Math.max(0, (state.endedAt ?? Date.now()) - state.startedAt)
    : null

  async function handleSubmit() {
    if (
      isSubmittingRef.current ||
      state.status === 'streaming' ||
      state.status === 'awaiting_user'
    ) {
      return
    }

    const text = inputValue.trim()
    if (!text) {
      return
    }

    isSubmittingRef.current = true
    try {
      await submitInput(text)
      setInputValue('')
    } finally {
      isSubmittingRef.current = false
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.nativeEvent.isComposing) {
      return
    }

    if (
      e.key === 'Enter' &&
      (e.metaKey || e.ctrlKey) &&
      !e.shiftKey &&
      state.status !== 'streaming' &&
      state.status !== 'awaiting_user'
    ) {
      e.preventDefault()
      handleSubmit()
    }
  }

  function handleSuggestionClick(text: string) {
    setInputValue(text)
    document.querySelector<HTMLTextAreaElement>('[name="workspace-query"]')?.focus()
  }

  return (
    <>
      <section className={`${hasRunPanel ? 'mb-5' : 'mb-9'} rounded-[2rem] border border-border/10 bg-muted/35 p-4 shadow-[var(--shadow-elevation-1)] sm:p-6 lg:p-8`}>
        <div className="mb-6 max-w-3xl">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/70">
            {t('instruction')}
          </p>
          <h1 className="font-headline text-[2rem] font-semibold tracking-[-0.02em] text-on-surface sm:text-[2.15rem] lg:text-[2.6rem]">
            {t('title')}
          </h1>
          <p className="mt-3 max-w-2xl text-[14px] leading-6 text-on-surface-variant sm:text-[15px] sm:leading-7">
            {t('description')}
          </p>
        </div>

        <div className="relative">
          <div className="pointer-events-none absolute top-4 left-4 sm:top-5 sm:left-5">
            <Sparkles className="h-4 w-4 text-on-surface-variant/70 sm:h-5 sm:w-5" />
          </div>
          <label className="sr-only" htmlFor="workspace-query">{t('inputLabel')}</label>
          <Textarea
            id="workspace-query"
            aria-label={t('inputLabel')}
            aria-keyshortcuts="Meta+Enter Control+Enter"
            className="max-h-56 w-full resize-none overflow-y-auto rounded-[1.35rem] border border-border/10 bg-surface-container-lowest pt-4 pr-4 pb-[4.3rem] pl-12 text-[15px] leading-6 text-on-surface shadow-[var(--shadow-elevation-3)] transition-[box-shadow,border-color] duration-200 placeholder:text-on-surface-variant/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/15 focus:shadow-[var(--shadow-soft)] sm:max-h-64 sm:pt-5 sm:pr-5 sm:pb-[4.5rem] sm:pl-14 sm:text-base"
            name="workspace-query"
            placeholder={t('inputPlaceholder')}
            value={inputValue}
            rows={3}
            maxLength={6000}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {state.status === 'streaming' ? (
            <div className="absolute right-3 bottom-3 flex items-center gap-2 sm:right-4 sm:bottom-3.5">
              <span className="hidden text-xs text-on-surface-variant/70 sm:inline">{t('processing')}</span>
              <Button
                type="button"
                variant="ghost"
                onClick={cancelRun}
                className="h-8 rounded-full px-3 text-xs text-destructive hover:text-destructive"
              >
                <Loader2 className="mr-1 size-3 animate-spin sm:hidden" />
                {t('cancel')}
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={
                state.status === 'awaiting_user' ||
                inputValue.trim().length === 0
              }
              className="absolute right-3 bottom-3 h-9 rounded-full px-3.5 text-xs shadow-[var(--shadow-elevation-1)] transition-all duration-200 active:scale-[0.97] sm:right-4 sm:bottom-3.5 sm:h-10 sm:px-5 sm:text-sm"
            >
              <SendHorizontal className="mr-1 size-3.5 sm:mr-1.5" />
              <span>{t('sending')}</span>
            </Button>
          )}
        </div>
        {inputValue ? (
          <p className="mt-2 px-4 text-xs text-on-surface-variant/80">
            {t('sendingHint')}
          </p>
        ) : null}

        <QuickInputSuggestions
          onSuggestionClick={handleSuggestionClick}
          hidden={hasRunPanel}
          label={t('suggestionsLabel')}
          items={[t('suggestions.pomodoro'), t('suggestions.report'), t('suggestions.saveLink')]}
        />
      </section>

      {!hasRunPanel && pendingRun && !pendingRunLoading ? (
        <Card className="mb-5 border-border/10 bg-surface-container-lowest/88 shadow-[var(--shadow-elevation-1)]">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-on-surface">{t('pendingRunTitle')}</p>
              <p className="text-sm text-on-surface-variant">
                {pendingRun.interaction.message}
              </p>
              <p className="text-xs text-on-surface-variant/80">
                {tRun('updated')}  {formatAbsoluteTime(pendingRun.updatedAt)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  void dismissPendingRun()
                }}
                disabled={pendingRunDismissing}
                className="rounded-full"
              >
                {pendingRunDismissing ? t('pendingRunDismissing') : t('pendingRunDismiss')}
              </Button>
              <Button
                type="button"
                onClick={restorePendingRun}
                className="rounded-full"
              >
                {t('pendingRunResume')}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <AnimatePresence mode="wait">
        {hasRunPanel && (
          <WorkspaceRunPanel
            key="run-panel"
            status={state.status}
            assistantText={state.result?.answer ?? state.result?.summary ?? null}
            result={state.result}
            errorMessage={state.errorMessage}
            runId={state.runId}
            interaction={state.interaction}
            timeline={state.timeline}
            understandingPreview={state.understandingPreview}
            planPreview={state.planPreview}
            elapsedMs={elapsedMs}
            onResume={resumeInteraction}
          />
        )}
      </AnimatePresence>

      {hasRunPanel && state.status !== 'streaming' && state.status !== 'awaiting_user' ? (
        <div className="-mt-4 mb-8 flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              resetRun()
            }}
            className="rounded-full text-on-surface-variant hover:text-on-surface"
          >
            {t('collapseResults')}
          </Button>
        </div>
      ) : null}

      {!hasRunPanel ? (
        <section className="mt-8">
          <div className="flex items-center gap-4 mb-2">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
              {t('recentCaptures')}
            </h2>
            <div className="flex-1 h-px bg-border/20" />
          </div>

          {recentItems.length === 0 ? (
            <p className="text-sm text-on-surface-variant">
              {t('emptyRecent')}
            </p>
          ) : (
            <div>
              {recentItems.map((asset) => {
                const presentation = assetTypePresentation[asset.type]
                return (
                  <RecentItem
                    key={asset.id}
                    icon={presentation.icon}
                    iconBg={presentation.iconBg}
                    iconColor={presentation.iconColor}
                    title={asset.title}
                    excerpt={asset.excerpt}
                    time={formatAbsoluteTime(asset.createdAt)}
                    type={tCommon(`assets.${getAssetLocaleKey(asset.type)}`)}
                    timeText={asset.timeText}
                    dueAt={asset.dueAt}
                    assetType={asset.type}
                  />
                )
              })}
            </div>
          )}
        </section>
      ) : null}
    </>
  )
}
