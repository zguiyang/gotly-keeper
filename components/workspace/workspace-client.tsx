'use client'

import {
  FileText,
  Link2,
  StickyNote,
  Sparkles,
} from 'lucide-react'

function QuickActionChips() {
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
          className="px-3 py-1.5 text-xs font-medium bg-surface-container-low hover:bg-surface-container-high rounded-sm border border-outline-variant/20 transition-colors duration-150 cursor-pointer text-on-surface-variant"
        >
          {chip}
        </button>
      ))}
    </div>
  )
}

function CaptureSurface() {
  return (
    <section className="mb-12">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
          <Sparkles className="w-5 h-5 text-on-surface-variant/50" />
        </div>
        <input
          className="w-full h-14 bg-surface-container-lowest rounded-full pl-14 pr-28 text-base text-on-surface placeholder:text-on-surface-variant/40 shadow-[0_4px_16px_rgba(0,0,0,0.06)] border border-outline-variant/10 focus:outline-none focus:ring-2 focus:ring-primary/15 focus:shadow-[0_8px_24px_rgba(0,0,0,0.1)] transition-all duration-200"
          placeholder="粘贴链接、记下想法或搜索..."
          type="text"
        />
        <button className="absolute inset-y-0 right-2 my-auto flex items-center gap-2 px-5 h-10 bg-primary hover:bg-primary/90 text-on-primary rounded-full font-medium text-sm transition-all duration-150 cursor-pointer hover:shadow-[0_4px_12px_rgba(0,81,177,0.2)]">
          提交
        </button>
      </div>
    </section>
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
}: {
  icon: React.ElementType
  iconBg: string
  iconColor: string
  title: string
  excerpt: string
  time: string
  type: string
}) {
  return (
    <div className="group py-4 border-t border-outline-variant/10 cursor-pointer hover:bg-surface-container-low/50 -mx-2 px-2 transition-colors duration-150">
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
            {type}
          </p>
        </div>
      </div>
    </div>
  )
}

export function WorkspaceClient({ userName }: { userName: string }) {
  const recentItems = [
    {
      icon: FileText,
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
      title: '产品规划笔记',
      excerpt: '讨论了关于 2024 年 Q3 季度的 AI 功能迭代路线，包含自动化分类和多端同步的优先级调整...',
      time: '2小时前',
      type: '个人灵感',
    },
    {
      icon: Link2,
      iconBg: 'bg-secondary/10',
      iconColor: 'text-secondary',
      title: 'GitHub 链接',
      excerpt: 'github.com/gotly-ai/core-engine-v2',
      time: '昨天',
      type: '技术收藏',
    },
    {
      icon: StickyNote,
      iconBg: 'bg-tertiary/10',
      iconColor: 'text-tertiary',
      title: '会议记录总结',
      excerpt: 'AI 自动生成的摘要：重点在于市场推广渠道的下沉，以及针对学生群体的定价策略调整...',
      time: '3天前',
      type: '工作周报',
    },
  ]

  return (
    <>
      <div className="mb-10">
        <h1 className="text-2xl font-headline font-bold text-on-surface tracking-tight">
          想到什么，先放这
        </h1>
        <p className="text-sm text-on-surface-variant mt-1">
          Gotly 负责整理，你负责创造。灵感永不流失。
        </p>
        <QuickActionChips />
      </div>

      <CaptureSurface />

      <section>
        <div className="flex items-center gap-4 mb-2">
          <h2 className="text-xs font-medium uppercase tracking-wider text-on-surface-variant">
            最近捕获
          </h2>
          <div className="flex-1 h-px bg-outline-variant/20" />
        </div>

        <div className="mt-4">
          {recentItems.map((item, index) => (
            <RecentItem key={index} {...item} />
          ))}
        </div>
      </section>
    </>
  )
}
