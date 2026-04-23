'use client'

import { Sparkles } from 'lucide-react'
import { AnimatePresence } from 'motion/react'
import { useCallback, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { assetTypePresentation } from '@/config/ui/asset-presentation'
import { useWorkspaceStream } from '@/hooks/workspace/use-workspace-stream'
import { formatAbsoluteTime } from '@/shared/time/formatters'

import { RecentItem } from './workspace-result-panels'
import { WorkspaceRunPanel } from './workspace-run-panel'
import { workspacePillClassName } from './workspace-view-primitives'

import type { AssetListItem } from '@/shared/assets/assets.types'
import type { WorkspaceRunApiResponse } from '@/shared/workspace/workspace-runner.types'

const commandPreviewRows = [
  {
    input: '粘贴一个链接',
    target: '书签',
    hint: '补全来源、摘要和后续可追踪信息。',
    accent: 'bg-sky-600/60',
  },
  {
    input: '明天下午提醒我',
    target: '待办',
    hint: '抽取时间，并把它放进任务流。',
    accent: 'bg-emerald-600/60',
  },
  {
    input: '记录一个想法',
    target: '笔记',
    hint: '沉到手稿区，保留原始表达。',
    accent: 'bg-amber-700/60',
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

function CommandPreviewStrip() {
  return (
    <div className="mt-5 rounded-[1.25rem] border border-border/10 bg-surface-container-lowest/72 p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border/10 pb-3">
        <span className="text-[11px] font-semibold tracking-[0.16em] text-primary/75 uppercase">
          命令预览
        </span>
        <p className="text-[13px] leading-6 text-on-surface-variant/75">
          Gotly 会先看懂输入，再决定保存、整理还是查询。
        </p>
      </div>

      <ol className="relative mt-4 space-y-2 pl-4 before:absolute before:bottom-2 before:left-1.5 before:top-1 before:w-px before:bg-border/15">
        {commandPreviewRows.map((item) => (
          <li
            key={item.input}
            className="relative rounded-xl border border-border/10 bg-muted/22 px-3 py-2.5"
          >
            <span className={`absolute -left-[0.72rem] top-3 size-2.5 rounded-full ${item.accent}`} />
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <p className="text-[14px] font-medium leading-6 text-on-surface">
                {item.input}
              </p>
              <span className={workspacePillClassName}>{item.target}</span>
            </div>
            <p className="mt-0.5 text-[12px] leading-5 text-on-surface-variant/75">
              {item.hint}
            </p>
          </li>
        ))}
      </ol>
    </div>
  )
}

export function WorkspaceClient({
  recentAssets,
}: {
  recentAssets: AssetListItem[]
}) {
  const [inputValue, setInputValue] = useState('')
  const [submittedText, setSubmittedText] = useState('')
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

    setSubmittedText(text)
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
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/70">
            Command
          </p>
          <h1 className="font-headline text-[2rem] font-semibold tracking-[-0.02em] text-on-surface sm:text-[2.15rem] lg:text-[2.6rem]">
            先捕获，再让 Gotly 帮你整理
          </h1>
          <p className="mt-3 max-w-2xl text-[14px] leading-6 text-on-surface-variant sm:text-[15px] sm:leading-7">
            写想法、粘贴链接、安排待办，或直接问知识库。这里是唯一入口，不需要先决定内容放在哪。
          </p>
        </div>

        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 sm:pl-5">
            <Sparkles className="h-4 w-4 text-on-surface-variant/70 sm:h-5 sm:w-5" />
          </div>
          <Input
            aria-label="输入内容或搜索知识库"
            className="h-[3.25rem] w-full rounded-full border border-border/10 bg-surface-container-lowest pl-12 pr-24 text-[15px] text-on-surface shadow-[var(--shadow-elevation-3)] transition-[box-shadow,border-color] duration-200 placeholder:text-on-surface-variant/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/15 focus:shadow-[var(--shadow-soft)] sm:h-[3.5rem] sm:pl-14 sm:pr-32 sm:text-base lg:h-[3.75rem]"
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
            className="absolute inset-y-0 right-2 my-auto h-9 rounded-full px-4 sm:h-10 sm:px-5"
          >
            {state.status === 'streaming' ? (
              '处理中…'
            ) : (
              <>
                <span className="sm:hidden">提交</span>
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

        {!hasRunPanel ? <CommandPreviewStrip /> : null}
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
            submittedText={submittedText}
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
              setSubmittedText('')
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
