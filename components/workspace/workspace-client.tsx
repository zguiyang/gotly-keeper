'use client'

import { Sparkles } from 'lucide-react'
import { AnimatePresence } from 'motion/react'
import { useCallback, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { assetTypePresentation } from '@/config/ui/asset-presentation'
import { useWorkspaceStream } from '@/hooks/workspace/use-workspace-stream'
import { formatAbsoluteTime } from '@/shared/time/formatters'

import {
  RecentItem,
  WorkspaceQueryResultsContent,
} from './workspace-result-panels'
import { WorkspaceRunPanel } from './workspace-run-panel'

import type { AssetListItem } from '@/shared/assets/assets.types'
import type { WorkspaceRunApiResponse } from '@/shared/workspace/workspace-runner.types'

function QuickInputSuggestions({
  onSuggestionClick,
  hidden,
}: {
  onSuggestionClick: (text: string) => void
  hidden: boolean
}) {
  const suggestions = [
    '帮我找一下上周收藏的文章',
    '记一下首页文案方向',
    '总结最近笔记重点',
  ]

  return (
    <div className={`mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 ${hidden ? 'hidden' : ''}`}>
      <span className="shrink-0 text-[11px] font-medium tracking-[0.04em] text-on-surface-variant/50 uppercase">
        试试这样说
      </span>
      {suggestions.map((suggestion, index) => (
        <button
          type="button"
          key={index}
          onClick={() => onSuggestionClick(suggestion)}
          className="group flex items-center gap-1.5 text-left"
        >
          {index > 0 && (
            <span className="text-[10px] text-on-surface-variant/30">·</span>
          )}
          <span className="text-[13px] text-on-surface-variant/60 group-hover:text-on-surface-variant transition-colors duration-150">
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

  const handleWorkspaceResult = useCallback((result: WorkspaceRunApiResponse['data']) => {
    if (result.kind !== 'mutation' || result.action !== 'create' || !result.item) {
      return
    }

    const createdItem = result.item
    setRecentItems((items) => [
      createdItem,
      ...items.filter((item) => item.id !== createdItem.id),
    ].slice(0, 10))
  }, [])

  const { state, submitInput } = useWorkspaceStream({
    onResult: handleWorkspaceResult,
  })

  async function handleSubmit() {
    const text = inputValue.trim()
    if (!text) {
      return
    }

    await submitInput(text)

    setInputValue('')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && state.status !== 'streaming') {
      e.preventDefault()
      handleSubmit()
    }
  }

  function handleSuggestionClick(text: string) {
    setInputValue(text)
    document.querySelector<HTMLInputElement>('[name="workspace-query"]')?.focus()
  }

  const hasResult = state.result?.kind === 'query'

  return (
    <>
      <div className="mb-8">
        <h1 className="font-headline text-[2.2rem] font-semibold tracking-[-0.03em] text-on-surface lg:text-[2.8rem]">
          想到什么，先放这
        </h1>
        <p className="mt-2 max-w-3xl text-[15px] leading-7 text-on-surface-variant">
          先收好，之后找回。Gotly 负责整理，你负责创造。
        </p>
      </div>

      <section className="mb-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
            <Sparkles className="w-5 h-5 text-on-surface-variant/50" />
          </div>
          <Input
            aria-label="输入内容或搜索知识库"
            className="h-15 w-full rounded-full border border-border/10 bg-surface-container-lowest pl-14 pr-28 text-base text-on-surface shadow-[var(--shadow-elevation-3)] transition-[box-shadow,border-color] duration-200 placeholder:text-on-surface-variant/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/15 focus:shadow-[var(--shadow-soft)]"
            name="workspace-query"
            placeholder="粘贴链接、记下想法或搜索…"
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={state.status === 'streaming'}
            className="absolute inset-y-0 right-2 my-auto h-11 rounded-full px-5"
          >
            {state.status === 'streaming' ? '处理中…' : '提交'}
          </Button>
        </div>
        {state.errorMessage ? (
          <p className="mt-2 px-4 text-xs text-on-surface-variant/60" aria-live="polite">
            {state.errorMessage}
          </p>
        ) : inputValue ? (
          <p className="mt-2 px-4 text-xs text-on-surface-variant/60">
            输入后会保存到知识库，查询结果会出现在这里
          </p>
        ) : null}
      </section>

      <QuickInputSuggestions
        onSuggestionClick={handleSuggestionClick}
        hidden={state.status === 'streaming'}
      />

      <AnimatePresence mode="wait">
        {(state.status === 'streaming' || state.phases.length > 0 || state.assistantText) && (
          <WorkspaceRunPanel
            key="run-panel"
            status={state.status === 'idle' ? 'success' : state.status}
            assistantText={state.assistantText}
            phases={state.phases}
          />
        )}
      </AnimatePresence>

      {hasResult ? (
        <section className="mt-8">
          <div className="mb-3 flex items-center gap-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/70">
              本次处理
            </h2>
            <div className="flex-1 h-px bg-border/20" />
          </div>
          <div className="rounded-2xl border border-border/10 bg-surface-container-lowest p-4 shadow-[var(--shadow-soft)]">
            {state.result?.kind === 'query' ? (
              <WorkspaceQueryResultsContent results={state.result.items} />
            ) : null}
          </div>
        </section>
      ) : null}

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
                />
              )
            })}
          </div>
        )}
      </section>
    </>
  )
}
