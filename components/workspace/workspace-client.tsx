'use client'

import { useState } from 'react'
import { Sparkles } from 'lucide-react'

import { callAction } from '@/components/actions/call-action'
import { type AssetListItem } from '@/shared/assets/assets.types'
import {
  createWorkspaceAssetAction,
  reviewUnfinishedTodosAction,
  summarizeRecentBookmarksAction,
  summarizeRecentNotesAction,
} from '@/app/workspace/actions'
import {
  RecentItem,
  assetTypePresentation,
  formatAssetTime,
  WorkspaceBookmarkSummaryPanel,
  WorkspaceNoteSummaryPanel,
  WorkspaceQueryResultsPanel,
  WorkspaceTodoReviewPanel,
} from './workspace-result-panels'
import {
  type WorkspaceActionState,
  createInitialWorkspaceActionState,
  toSubmitting,
  toError,
  applyWorkspaceActionResult,
} from './workspace-action-state'

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
    <div className="flex flex-wrap gap-2 mt-4">
      {chips.map((chip, index) => (
        <button
          key={index}
          onClick={() => onChipClick(chip)}
          className="px-3 py-1.5 text-xs font-medium bg-surface-container-low hover:bg-surface-container-high rounded-sm border border-outline-variant/20 transition-colors duration-150 cursor-pointer text-on-surface-variant"
        >
          {chip}
        </button>
      ))}
      <button
        type="button"
        onClick={onReviewTodos}
        disabled={disabled}
        className="px-3 py-1.5 text-xs font-medium bg-primary text-on-primary hover:bg-primary/90 rounded-sm transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        复盘未完成待办
      </button>
      <button
        type="button"
        onClick={onSummarizeNotes}
        disabled={disabled}
        className="px-3 py-1.5 text-xs font-medium bg-secondary text-on-secondary hover:bg-secondary/90 rounded-sm transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        总结最近笔记
      </button>
      <button
        type="button"
        onClick={onSummarizeBookmarks}
        disabled={disabled}
        className="px-3 py-1.5 text-xs font-medium bg-secondary text-on-secondary hover:bg-secondary/90 rounded-sm transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
  const [actionState, setActionState] = useState<WorkspaceActionState>(createInitialWorkspaceActionState)
  const [recentItems, setRecentItems] = useState(recentAssets)

  const { status, message, queryResult, todoReview, noteSummary, bookmarkSummary } = actionState

  async function handleSubmit() {
    const text = inputValue.trim()
    if (!text) {
      setActionState((previous) => toError(previous, '先输入一句内容。'))
      return
    }

    setActionState((previous) => toSubmitting(previous))

    try {
      const result = await callAction(() => createWorkspaceAssetAction(text), {
        loading: '处理中...',
        success: '已完成。',
        error: '处理失败，请重试。',
      })

      if (result.kind === 'created') {
        setRecentItems((items) => [result.asset, ...items].slice(0, 6))
        setInputValue('')
        setActionState((previous) => applyWorkspaceActionResult(previous, result))
        return
      }

      setActionState((previous) => applyWorkspaceActionResult(previous, result))
    } catch {
      setActionState((previous) => toError(previous))
    }
  }

  async function handleReviewTodos() {
    if (status === 'submitting') return

    setActionState((previous) => toSubmitting(previous))

    try {
      const result = await callAction(() => reviewUnfinishedTodosAction(), {
        loading: '正在复盘待办...',
        success: '待办复盘已生成。',
        error: '待办复盘失败，请重试。',
      })

      setActionState((previous) => applyWorkspaceActionResult(previous, result))
    } catch {
      setActionState((previous) => toError(previous, '待办复盘失败，请重试。'))
    }
  }

  async function handleSummarizeNotes() {
    if (status === 'submitting') return

    setActionState((previous) => toSubmitting(previous))

    try {
      const result = await callAction(() => summarizeRecentNotesAction(), {
        loading: '正在总结笔记...',
        success: '笔记摘要已生成。',
        error: '笔记摘要失败，请重试。',
      })

      setActionState((previous) => applyWorkspaceActionResult(previous, result))
    } catch {
      setActionState((previous) => toError(previous, '笔记摘要失败，请重试。'))
    }
  }

  async function handleSummarizeBookmarks() {
    if (status === 'submitting') return

    setActionState((previous) => toSubmitting(previous))

    try {
      const result = await callAction(() => summarizeRecentBookmarksAction(), {
        loading: '正在总结书签...',
        success: '书签摘要已生成。',
        error: '书签摘要失败，请重试。',
      })

      setActionState((previous) => applyWorkspaceActionResult(previous, result))
    } catch {
      setActionState((previous) => toError(previous, '书签摘要失败，请重试。'))
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && status !== 'submitting') {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-on-surface tracking-tight font-[family-name:var(--font-manrope)]">
          想到什么，先放这
        </h1>
        <p className="text-sm text-on-surface-variant mt-1">
          先收好，之后找回。Gotly 负责整理，你负责创造。
        </p>
        <QuickActionChips
          onChipClick={(text) => setInputValue(text)}
          onReviewTodos={handleReviewTodos}
          onSummarizeBookmarks={handleSummarizeBookmarks}
          onSummarizeNotes={handleSummarizeNotes}
          disabled={status === 'submitting'}
        />
      </div>

      <section className="mb-8">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
            <Sparkles className="w-5 h-5 text-on-surface-variant/50" />
          </div>
          <input
            className="w-full h-14 bg-surface-container-lowest rounded-full pl-14 pr-28 text-base text-on-surface placeholder:text-on-surface-variant/40 shadow-[0_4px_16px_rgba(0,0,0,0.06)] border border-outline-variant/10 focus:outline-none focus:ring-2 focus:ring-primary/15 focus:shadow-[0_8px_24px_rgba(0,0,0,0.1)] transition-all duration-200"
            placeholder="粘贴链接、记下想法或搜索..."
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={status === 'submitting'}
            className="absolute inset-y-0 right-2 my-auto flex items-center justify-center gap-2 px-5 h-10 bg-primary hover:bg-primary/90 text-on-primary rounded-full font-medium text-sm transition-all duration-150 cursor-pointer hover:shadow-[0_4px_12px_rgba(0,81,177,0.2)] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            {status === 'submitting' ? '处理中...' : '提交'}
          </button>
        </div>
        {message ? (
          <p className="text-xs text-on-surface-variant/60 mt-2 px-4">
            {message}
          </p>
        ) : inputValue ? (
          <p className="text-xs text-on-surface-variant/60 mt-2 px-4">
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
                  time={formatAssetTime(new Date(asset.createdAt))}
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
