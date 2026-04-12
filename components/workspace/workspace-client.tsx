'use client'

import { useState } from 'react'
import {
  FileText,
  Link2,
  StickyNote,
  Sparkles,
} from 'lucide-react'

import { callAction } from '@/components/actions/call-action'
import {
  type AssetListItem,
  type AssetQueryResult,
} from '@/shared/assets/assets.types'
import { createWorkspaceAssetAction } from '@/app/workspace/actions'

function QuickActionChips({
  onChipClick,
}: {
  onChipClick: (text: string) => void
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
    </div>
  )
}

function RecentItem({
  icon: Icon,
  iconBg,
  iconColor,
  title,
  excerpt,
  time,
  type,
  timeText,
}: {
  icon: React.ElementType
  iconBg: string
  iconColor: string
  title: string
  excerpt: string
  time: string
  type: string
  timeText?: string | null
}) {
  return (
    <div className="group py-4 border-t border-outline-variant/10 cursor-pointer hover:bg-surface-container-low/50 focus-within:bg-surface-container-low/50 -mx-2 px-2 rounded-sm transition-colors duration-150">
      <div className="flex items-start gap-4">
        <div className={`w-8 h-8 rounded-sm flex items-center justify-center flex-shrink-0 ${iconBg}`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-sm font-medium text-on-surface group-hover:text-primary transition-colors truncate">
              {title}
            </h3>
            <span className="text-xs text-on-surface-variant flex-shrink-0">
              {time}
            </span>
          </div>
          <p className="text-xs text-on-surface-variant mt-1 line-clamp-1 leading-relaxed">
            {excerpt}
          </p>
          <p className="text-xs text-on-surface-variant/60 mt-1">
            {timeText ? `${type} · ${timeText}` : type}
          </p>
        </div>
      </div>
    </div>
  )
}

function QueryResults({
  query,
  results,
}: {
  query: string
  results: AssetListItem[]
}) {
  return (
    <section className="mb-8">
      <div className="flex items-center gap-4 mb-2">
        <h2 className="text-xs font-medium uppercase tracking-wider text-on-surface-variant">
          查询结果
        </h2>
        <div className="flex-1 h-px bg-outline-variant/20" />
      </div>
      <p className="text-xs text-on-surface-variant/60 mb-3">
        {`"${query}"`}
      </p>
      {results.length === 0 ? (
        <p className="text-sm text-on-surface-variant">
          没有找到相关内容。可以换个关键词，或先在上方保存一条新记录。
        </p>
      ) : (
        <div>
          {results.map((asset) => {
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
  )
}

const assetTypePresentation = {
  note: { icon: FileText, iconBg: 'bg-primary/10', iconColor: 'text-primary', label: '普通记录' },
  link: { icon: Link2, iconBg: 'bg-secondary/10', iconColor: 'text-secondary', label: '书签' },
  todo: { icon: StickyNote, iconBg: 'bg-tertiary/10', iconColor: 'text-tertiary', label: '待办' },
}

function formatAssetTime(date: Date): string {
  return date.toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function WorkspaceClient({
  recentAssets,
}: {
  recentAssets: AssetListItem[]
}) {
  const [inputValue, setInputValue] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)
  const [recentItems, setRecentItems] = useState(recentAssets)
  const [queryResult, setQueryResult] = useState<AssetQueryResult | null>(null)

  async function handleSubmit() {
    const text = inputValue.trim()
    if (!text) {
      setStatus('error')
      setMessage('先输入一句内容。')
      return
    }

    setStatus('submitting')
    setMessage(null)

    try {
      const result = await callAction(() => createWorkspaceAssetAction(text), {
        loading: '处理中...',
        success: '已完成。',
        error: '处理失败，请重试。',
      })

      if (result.kind === 'created') {
        setRecentItems((items) => [result.asset, ...items].slice(0, 6))
        setQueryResult(null)
        setInputValue('')
        setStatus('success')
        return
      }

      setQueryResult({ query: result.query, results: result.results })
      setStatus('success')
    } catch {
      setStatus('error')
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
        <QuickActionChips onChipClick={(text) => setInputValue(text)} />
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
        <QueryResults query={queryResult.query} results={queryResult.results} />
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
