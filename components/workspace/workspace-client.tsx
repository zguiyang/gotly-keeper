'use client'

import { Sparkles } from 'lucide-react'
import { useState } from 'react'

import { assetTypePresentation } from '@/config/ui/asset-presentation'
import { useWorkspaceSubmit } from '@/hooks/workspace/use-workspace-submit'
import { type AssetListItem } from '@/shared/assets/assets.types'
import { formatAbsoluteTime } from '@/shared/time/formatters'

import {
  RecentItem,
  WorkspaceBookmarkSummaryPanel,
  WorkspaceNoteSummaryPanel,
  WorkspaceQueryResultsPanel,
  WorkspaceTodoReviewPanel,
} from './workspace-result-panels'

function QuickActionChips({
  onChipClick,
  onReviewTodos,
  onSummarizeBookmarks,
  onSummarizeNotes,
  disabled,
}: {
  onChipClick: (text: string) => void
  onReviewTodos: () => void
  onSummarizeBookmarks: () => void
  onSummarizeNotes: () => void
  disabled: boolean
}) {
  const chips = [
    '帮我找一下上周收藏的文章',
    '把这个链接收起来，后面再看',
    '记一下首页文案方向',
  ]

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {chips.map((chip, index) => (
        <button
          type="button"
          key={index}
          onClick={() => onChipClick(chip)}
          className="rounded-sm border border-outline-variant/20 bg-surface-container-low px-3 py-1.5 text-xs font-medium text-on-surface-variant transition-colors duration-150 hover:bg-surface-container-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          {chip}
        </button>
      ))}
      <button
        type="button"
        onClick={onReviewTodos}
        disabled={disabled}
        className="rounded-sm bg-primary px-3 py-1.5 text-xs font-medium text-on-primary transition-colors duration-150 hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50"
      >
        复盘未完成待办
      </button>
      <button
        type="button"
        onClick={onSummarizeNotes}
        disabled={disabled}
        className="rounded-sm bg-secondary px-3 py-1.5 text-xs font-medium text-on-secondary transition-colors duration-150 hover:bg-secondary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50"
      >
        总结最近笔记
      </button>
      <button
        type="button"
        onClick={onSummarizeBookmarks}
        disabled={disabled}
        className="rounded-sm bg-secondary px-3 py-1.5 text-xs font-medium text-on-secondary transition-colors duration-150 hover:bg-secondary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50"
      >
        总结最近书签
      </button>
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

  const { state, submit, reviewTodos, summarizeNotes, summarizeBookmarks } = useWorkspaceSubmit()

  const { status, message, queryResult, todoReview, noteSummary, bookmarkSummary } = state

  async function handleSubmit() {
    const text = inputValue.trim()
    if (!text) {
      return
    }
    const result = await submit(text)

    if (result?.kind === 'created') {
      setRecentItems((items) => [result.asset, ...items].slice(0, 6))
    }

    setInputValue('')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && status !== 'submitting') {
      e.preventDefault()
      handleSubmit()
    }
  }

  function handleChipClick(text: string) {
    setInputValue(text)
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="font-headline text-2xl font-bold tracking-tight text-on-surface lg:text-3xl">
          想到什么，先放这
        </h1>
        <p className="text-sm text-on-surface-variant mt-1">
          先收好，之后找回。Gotly 负责整理，你负责创造。
        </p>
        <QuickActionChips
          onChipClick={handleChipClick}
          onReviewTodos={reviewTodos}
          onSummarizeBookmarks={summarizeBookmarks}
          onSummarizeNotes={summarizeNotes}
          disabled={status === 'submitting'}
        />
      </div>

      <section className="mb-8">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
            <Sparkles className="w-5 h-5 text-on-surface-variant/50" />
          </div>
          <input
            aria-label="输入内容或搜索知识库"
            className="h-14 w-full rounded-full border border-outline-variant/10 bg-surface-container-lowest pl-14 pr-28 text-base text-on-surface shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-[box-shadow,border-color] duration-200 placeholder:text-on-surface-variant/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/15 focus:shadow-[0_8px_24px_rgba(0,0,0,0.1)]"
            name="workspace-query"
            placeholder="粘贴链接、记下想法或搜索…"
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={status === 'submitting'}
            className="absolute inset-y-0 right-2 my-auto flex h-10 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-on-primary transition-[background-color,box-shadow] duration-150 hover:bg-primary/90 hover:shadow-[0_4px_12px_rgba(0,81,177,0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status === 'submitting' ? '处理中…' : '提交'}
          </button>
        </div>
        {message ? (
          <p className="mt-2 px-4 text-xs text-on-surface-variant/60" aria-live="polite">
            {message}
          </p>
        ) : inputValue ? (
          <p className="mt-2 px-4 text-xs text-on-surface-variant/60">
            输入后会保存到知识库，查询结果会出现在这里
          </p>
        ) : null}
      </section>

      {queryResult ? (
        <WorkspaceQueryResultsPanel query={queryResult.query} results={queryResult.results} />
      ) : todoReview ? (
        <WorkspaceTodoReviewPanel review={todoReview} />
      ) : noteSummary ? (
        <WorkspaceNoteSummaryPanel summary={noteSummary} />
      ) : bookmarkSummary ? (
        <WorkspaceBookmarkSummaryPanel summary={bookmarkSummary} />
      ) : null}

      <section>
        <div className="flex items-center gap-4 mb-2">
          <h2 className="text-xs font-medium uppercase tracking-wider text-on-surface-variant">
            最近捕获
          </h2>
          <div className="flex-1 h-px bg-outline-variant/20" />
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
