'use client'

import { Bookmark, CheckSquare, FileText, Search, Sparkles } from 'lucide-react'
import { AnimatePresence } from 'motion/react'
import { useCallback, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { assetTypePresentation } from '@/config/ui/asset-presentation'
import { useWorkspaceStream } from '@/hooks/workspace/use-workspace-stream'
import { formatAbsoluteTime } from '@/shared/time/formatters'

import { RecentItem } from './workspace-result-panels'
import { WorkspaceRunPanel } from './workspace-run-panel'

import type { AssetListItem } from '@/shared/assets/assets.types'
import type { WorkspaceRunApiResponse } from '@/shared/workspace/workspace-runner.types'

const workspaceCapabilities = [
  {
    icon: FileText,
    title: '保存想法',
    description: '写一句草稿、灵感或会议记录，Gotly 会整理成可回看的笔记。',
  },
  {
    icon: Bookmark,
    title: '收藏链接',
    description: '粘贴文章或网页地址，后续可以按来源和内容继续追踪。',
  },
  {
    icon: CheckSquare,
    title: '沉淀待办',
    description: '带有处理意图的内容会进入任务流，按时间线索归类。',
  },
  {
    icon: Search,
    title: '找回内容',
    description: '直接问“上周收藏的文章”，在已有知识库里检索答案。',
  },
]

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
    <div className={`mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 px-1 ${hidden ? 'hidden' : ''}`}>
      <span className="shrink-0 text-[11px] font-semibold tracking-[0.12em] text-on-surface-variant/75 uppercase">
        示例
      </span>
      {suggestions.map((suggestion, index) => (
        <button
          type="button"
          key={index}
          onClick={() => onSuggestionClick(suggestion)}
          className="group flex items-center gap-1.5 text-left"
        >
          {index > 0 && (
            <span className="text-[10px] text-on-surface-variant/55">·</span>
          )}
          <span className="text-[13px] text-on-surface-variant/80 group-hover:text-on-surface-variant transition-colors duration-150">
            {suggestion}
          </span>
        </button>
      ))}
    </div>
  )
}

function CapabilityStrip() {
  return (
    <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {workspaceCapabilities.map((item) => {
        const Icon = item.icon

        return (
          <div
            key={item.title}
            className="rounded-2xl border border-border/10 bg-surface-container-lowest/70 p-4 shadow-[var(--shadow-elevation-1)]"
          >
            <div className="mb-3 flex size-8 items-center justify-center rounded-xl bg-primary-fixed text-primary">
              <Icon className="size-4" />
            </div>
            <h2 className="text-sm font-semibold text-on-surface">{item.title}</h2>
            <p className="mt-1.5 text-xs leading-5 text-on-surface-variant/70">
              {item.description}
            </p>
          </div>
        )
      })}
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

  const { state, submitInput, resetRun } = useWorkspaceStream({
    onResult: handleWorkspaceResult,
  })
  const hasRunPanel =
    state.status === 'streaming' ||
    state.status === 'error' ||
    state.phases.length > 0 ||
    Boolean(state.assistantText)

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

  return (
    <>
      <section className={`${hasRunPanel ? 'mb-5' : 'mb-9'} rounded-[2rem] border border-border/10 bg-muted/35 p-4 shadow-[var(--shadow-elevation-1)] sm:p-6 lg:p-8`}>
        <div className="mb-6 max-w-3xl">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/70">
            Unified Capture
          </p>
          <h1 className="font-headline text-[2.25rem] font-semibold tracking-[-0.04em] text-on-surface lg:text-[3rem]">
            先捕获，再让 Gotly 帮你整理
          </h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-7 text-on-surface-variant">
            写想法、粘贴链接、安排待办，或直接问知识库。这里是唯一入口，不需要先决定内容放在哪。
          </p>
        </div>

        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
            <Sparkles className="w-5 h-5 text-on-surface-variant/70" />
          </div>
          <Input
            aria-label="输入内容或搜索知识库"
            className="h-[3.75rem] w-full rounded-full border border-border/10 bg-surface-container-lowest pl-14 pr-24 text-base text-on-surface shadow-[var(--shadow-elevation-3)] transition-[box-shadow,border-color] duration-200 placeholder:text-on-surface-variant/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/15 focus:shadow-[var(--shadow-soft)] sm:pr-36"
            name="workspace-query"
            placeholder="写一句话、粘贴链接，或直接问知识库…"
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={state.status === 'streaming'}
            className="absolute inset-y-0 right-2 my-auto h-11 rounded-full px-4 sm:px-5"
          >
            {state.status === 'streaming' ? (
              '处理中…'
            ) : (
              <>
                <span className="sm:hidden">执行</span>
                <span className="hidden sm:inline">捕获 / 查询</span>
              </>
            )}
          </Button>
        </div>
        {inputValue ? (
          <p className="mt-2 px-4 text-xs text-on-surface-variant/80">
            Gotly 会判断这是新内容还是查询请求，结果会在下方显示。
          </p>
        ) : null}

        <QuickInputSuggestions
          onSuggestionClick={handleSuggestionClick}
          hidden={hasRunPanel}
        />

        {!hasRunPanel ? <CapabilityStrip /> : null}
      </section>

      <AnimatePresence mode="wait">
        {hasRunPanel && (
          <WorkspaceRunPanel
            key="run-panel"
            status={state.status === 'idle' ? 'success' : state.status}
            assistantText={state.assistantText}
            phases={state.phases}
            result={state.result}
            errorMessage={state.errorMessage}
          />
        )}
      </AnimatePresence>

      {hasRunPanel && state.status !== 'streaming' ? (
        <div className="-mt-4 mb-8 flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={resetRun}
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
