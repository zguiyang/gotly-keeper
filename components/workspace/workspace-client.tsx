'use client'

import { SendHorizontal, Sparkles } from 'lucide-react'
import { AnimatePresence } from 'motion/react'
import { useCallback, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { assetTypePresentation } from '@/config/ui/asset-presentation'
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
}: {
  onSuggestionClick: (text: string) => void
  hidden: boolean
}) {
  const suggestions = [
    '记一下：首页 slogan 想走轻管家感',
    '记个待办：明天下午发报价',
    '帮我找一下最近的待办',
  ]

  return (
    <div
      className={`mt-3 flex items-center gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${
        hidden ? 'hidden' : ''
      }`}
    >
      <span className="shrink-0 text-[11px] font-semibold tracking-[0.12em] text-on-surface-variant/75 uppercase">
        示例
      </span>
      {suggestions.map((suggestion, index) => (
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

  const { state, submitInput, resetRun, resumeInteraction } = useWorkspaceStream({
    onResult: handleWorkspaceResult,
  })
  const hasRunPanel = state.status !== 'idle'
  const elapsedMs = state.startedAt
    ? Math.max(0, (state.endedAt ?? Date.now()) - state.startedAt)
    : null

  async function handleSubmit() {
    if (isSubmittingRef.current || state.status === 'streaming') {
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

    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !e.shiftKey && state.status !== 'streaming') {
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
            Command
          </p>
          <h1 className="font-headline text-[2rem] font-semibold tracking-[-0.02em] text-on-surface sm:text-[2.15rem] lg:text-[2.6rem]">
            先捕获，再让 Gotly Keeper 帮你整理
          </h1>
          <p className="mt-3 max-w-2xl text-[14px] leading-6 text-on-surface-variant sm:text-[15px] sm:leading-7">
            写想法、粘贴链接、安排待办，或直接问知识库。这里是唯一入口，不需要先决定内容放在哪。
          </p>
        </div>

        <div className="relative">
          <div className="pointer-events-none absolute top-4 left-4 sm:top-5 sm:left-5">
            <Sparkles className="h-4 w-4 text-on-surface-variant/70 sm:h-5 sm:w-5" />
          </div>
          <Textarea
            aria-label="输入内容或搜索知识库"
            aria-keyshortcuts="Meta+Enter Control+Enter"
            className="max-h-56 w-full resize-none overflow-y-auto rounded-[1.35rem] border border-border/10 bg-surface-container-lowest pt-4 pr-4 pb-[4.3rem] pl-12 text-[15px] leading-6 text-on-surface shadow-[var(--shadow-elevation-3)] transition-[box-shadow,border-color] duration-200 placeholder:text-on-surface-variant/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/15 focus:shadow-[var(--shadow-soft)] sm:max-h-64 sm:pt-5 sm:pr-5 sm:pb-[4.5rem] sm:pl-14 sm:text-base"
            name="workspace-query"
            placeholder="记一句、贴个链接，或直接问我…"
            value={inputValue}
            rows={3}
            maxLength={6000}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={state.status === 'streaming' || state.status === 'awaiting_user'}
            className="absolute right-3 bottom-3 h-8 rounded-full px-3 text-xs sm:right-4 sm:bottom-3.5 sm:h-9 sm:px-4 sm:text-sm"
          >
            {state.status === 'streaming' ? (
              '处理中'
            ) : (
              <>
                <span className="sm:hidden">发送</span>
                <span className="hidden sm:inline">发送</span>
                <SendHorizontal className="size-3.5" />
              </>
            )}
          </Button>
        </div>
        {inputValue ? (
          <p className="mt-2 px-4 text-xs text-on-surface-variant/80">
            Enter 换行，Cmd/Ctrl + Enter 发送。Gotly Keeper 会判断这是新内容还是查询请求，结果会在下方显示。
          </p>
        ) : null}

        <QuickInputSuggestions
          onSuggestionClick={handleSuggestionClick}
          hidden={hasRunPanel}
        />
      </section>

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
            understandingPreview={state.understandingPreview ?? state.result?.preview?.understanding ?? null}
            planPreview={state.planPreview ?? state.result?.preview?.plan ?? null}
            elapsedMs={elapsedMs}
            onResume={resumeInteraction}
          />
        )}
      </AnimatePresence>

      {hasRunPanel && state.status !== 'streaming' ? (
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
            收起结果，查看最近捕获
          </Button>
        </div>
      ) : null}

      {!hasRunPanel ? (
        <section className="mt-8">
          <div className="flex items-center gap-4 mb-2">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
              最近捕获
            </h2>
            <div className="flex-1 h-px bg-border/20" />
          </div>

          {recentItems.length === 0 ? (
            <p className="text-sm text-on-surface-variant">
              还没有保存内容，先随手记一句。
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
                    type={presentation.label}
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
