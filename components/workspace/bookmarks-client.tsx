'use client'

import { useState } from 'react'
import { Share2, Trash2, Bookmark } from 'lucide-react'

type BookmarkItem = {
  id: string
  source: string
  title: string
  summary: string
  time: string
}

const mockBookmarks: BookmarkItem[] = [
  {
    id: '1',
    source: 'github.com',
    title: 'Transformers.js: 浏览器端的机器学习新纪元',
    summary:
      'AI 摘要：本文深入探讨了如何利用 WebAssembly 在浏览器中直接运行大型语言模型，消除了后端推理延迟。重点介绍了 CPU 优化策略和内存管理，非常适合前端工程化背景。',
    time: '3 小时前收藏',
  },
  {
    id: '2',
    source: 'medium.com',
    title: '现代极简主义：如何在 UI 设计中找回"呼吸感"',
    summary:
      'AI 摘要：作者批判了现代 UI 中过度拥挤的卡片设计，提倡回归"纸本感"的排版美学。文中提到的非对称布局技巧可直接应用于 Gotly 的视觉迭代。',
    time: '昨天 14:20 收藏',
  },
  {
    id: '3',
    source: 'zhihu.com',
    title: '深度学习系统架构的演进历程与未来趋势',
    summary:
      'AI 摘要：梳理了从 AlexNet 到 GPT-4 的算力分配逻辑。收藏价值在于其对分布式训练中网络瓶颈的量化分析，可作为技术选型参考。',
    time: '2023年10月24日 收藏',
  },
  {
    id: '4',
    source: 'notion.so',
    title: '2024 年产品路线图规划：从数据驱动到 AI 驱动',
    summary:
      'AI 摘要：一套完整的产品策略模板。笔记标注了关于"零磨损交互"的三个关键点，建议在 Q1 开发周期中复用相关逻辑。',
    time: '2023年10月22日 收藏',
  },
]

const filterTabs = [
  { key: 'all', label: '全部收藏' },
  { key: 'article', label: '文章阅读' },
  { key: 'tech', label: '技术文档' },
  { key: 'design', label: '设计灵感' },
  { key: 'todo', label: '待办整理' },
]

function BookmarkItem({ item }: { item: BookmarkItem }) {
  return (
    <div className="group py-8 transition-all hover:bg-surface-container-low/50 -mx-4 px-4 rounded-xl">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="flex items-center space-x-3">
            <span className="text-xs font-semibold uppercase tracking-widest text-primary-container bg-primary/10 px-2 py-0.5 rounded">
              {item.source}
            </span>
            <span className="text-xs text-on-surface-variant/60">{item.time}</span>
          </div>
          <h3 className="text-xl font-bold text-on-surface group-hover:text-primary transition-colors cursor-pointer leading-snug">
            {item.title}
          </h3>
          <p className="text-on-surface-variant text-sm leading-relaxed max-w-3xl">
            {item.summary}
          </p>
        </div>
        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button className="p-2 text-on-surface-variant hover:text-primary transition-colors">
            <Share2 className="w-4 h-4" />
          </button>
          <button className="p-2 text-on-surface-variant hover:text-error transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

function Divider() {
  return <div className="h-px bg-outline-variant opacity-10 mx-4" />
}

export function BookmarksClient() {
  const [activeFilter, setActiveFilter] = useState<string>('all')

  return (
    <>
      <div className="mb-12">
        <h1 className="text-4xl font-extrabold text-on-surface tracking-tight mb-2 font-[family-name:var(--font-manrope)]">
          我的收藏
        </h1>
        <p className="text-on-surface-variant text-lg">
          这里的灵感与知识，正静候你的下一次翻阅。
        </p>
      </div>

      <div className="flex items-center space-x-6 mb-10 overflow-x-auto pb-2 scrollbar-hide">
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveFilter(tab.key)}
            className={`pb-2 whitespace-nowrap text-sm font-medium transition-colors relative ${
              activeFilter === tab.key
                ? 'text-primary font-bold border-b-2 border-primary'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="max-w-5xl">
        <div className="space-y-0">
          {mockBookmarks.map((item, index) => (
            <div key={item.id}>
              <BookmarkItem item={item} />
              {index < mockBookmarks.length - 1 && <Divider />}
            </div>
          ))}
        </div>

        {mockBookmarks.length === 0 && (
          <div className="mt-20 text-center py-12">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 rounded-full bg-surface-container-low flex items-center justify-center">
                <Bookmark className="w-6 h-6 text-on-surface-variant" />
              </div>
            </div>
            <p className="text-sm text-on-surface-variant font-medium">
              暂无收藏内容。
            </p>
          </div>
        )}

        {mockBookmarks.length > 0 && (
          <div className="mt-16 flex justify-center">
            <button className="text-sm font-medium text-primary hover:underline flex items-center space-x-2">
              <span>加载更多收藏</span>
              <span className="material-symbols-outlined text-base">expand_more</span>
            </button>
          </div>
        )}
      </div>
    </>
  )
}