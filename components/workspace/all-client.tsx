'use client'

import { useState } from 'react'
import {
  FileText,
  Link2,
  CheckCircle,
  MoreVertical,
} from 'lucide-react'

type AssetType = 'note' | 'link' | 'todo'

type Asset = {
  id: string
  icon: React.ElementType
  iconBg: string
  iconColor: string
  title: string
  excerpt: string
  tag: string
  time: string
  type: AssetType
  completed?: boolean
}

const mockAssets: Asset[] = [
  {
    id: '1',
    icon: FileText,
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
    title: '2024年Q3产品路线图深度调研笔记',
    excerpt: '整理了关于AI Agent在企业协作场景下的三个核心落地方向...',
    tag: '#个人灵感',
    time: '2小时前',
    type: 'note',
  },
  {
    id: '2',
    icon: Link2,
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    title: 'Figma 插件开发的最佳实践指南',
    excerpt: 'https://developer.figma.com/plugin-docs/intro/',
    tag: '#技术收藏',
    time: '4小时前',
    type: 'link',
  },
  {
    id: '3',
    icon: CheckCircle,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    title: '提交本周设计周报至内部系统',
    excerpt: '需要包含三个主要迭代点的性能对比数据截图',
    tag: '#工作待办',
    time: '6小时前',
    type: 'todo',
  },
  {
    id: '4',
    icon: FileText,
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
    title: '关于"数字游民"生活方式的访谈记录',
    excerpt: '受访者：Alex, 资深UI设计师，目前在巴厘岛远程办公...',
    tag: '#个人灵感',
    time: '昨天 14:20',
    type: 'note',
  },
  {
    id: '5',
    icon: Link2,
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    title: 'Tailwind CSS 官方文档 - 容器查询',
    excerpt: '介绍如何在不使用媒体查询的情况下实现组件级自适应...',
    tag: '#学习资料',
    time: '昨天 10:15',
    type: 'link',
  },
  {
    id: '6',
    icon: CheckCircle,
    iconBg: 'bg-surface-container-high',
    iconColor: 'text-on-surface-variant',
    title: '预定下周二去杭州的高铁票',
    excerpt: '已完成：G7345次列车，商务座',
    tag: '#生活',
    time: '昨天 09:00',
    type: 'todo',
    completed: true,
  },
]

const filterTabs = [
  { key: 'all', label: '全部' },
  { key: 'note', label: '笔记' },
  { key: 'link', label: '链接' },
  { key: 'todo', label: '待办' },
]

function DateDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center py-6">
      <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/60 mr-4">
        {label}
      </span>
      <div className="flex-1 h-px bg-outline-variant/10" />
    </div>
  )
}

function AssetItem({ asset }: { asset: Asset }) {
  const Icon = asset.icon

  return (
    <div className="group flex items-center py-5 hover:bg-surface-container-low/50 px-4 -mx-4 rounded-sm transition-all cursor-pointer">
      <div
        className={`w-10 h-10 flex-shrink-0 rounded-sm flex items-center justify-center mr-6 ${asset.iconBg}`}
      >
        <Icon className={`w-5 h-5 ${asset.iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-1">
          <h3
            className={`text-sm font-medium truncate ${
              asset.completed
                ? 'text-on-surface-variant line-through'
                : 'text-on-surface group-hover:text-primary transition-colors'
            }`}
          >
            {asset.title}
          </h3>
          <span className="px-2 py-0.5 rounded-sm bg-surface-container-high text-[10px] font-medium text-on-surface-variant flex-shrink-0">
            {asset.tag}
          </span>
        </div>
        <p
          className={`text-xs line-clamp-1 ${
            asset.completed ? 'text-on-surface-variant/60' : 'text-on-surface-variant'
          }`}
        >
          {asset.excerpt}
        </p>
      </div>
      <div className="ml-8 text-right flex-shrink-0">
        <span className="text-xs font-medium text-on-surface-variant/60">{asset.time}</span>
      </div>
      <div className="ml-6 opacity-0 group-hover:opacity-100 transition-opacity">
        <button className="p-1 text-on-surface-variant hover:text-primary rounded-sm transition-colors cursor-pointer">
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

export function AllClient() {
  const [activeFilter, setActiveFilter] = useState<string>('all')

  const filteredAssets =
    activeFilter === 'all'
      ? mockAssets
      : mockAssets.filter((asset) => asset.type === activeFilter)

  const todayAssets = filteredAssets.filter((asset) => asset.time.includes('小时') || asset.time.includes('分钟'))
  const yesterdayAssets = filteredAssets.filter((asset) => asset.time.includes('昨天'))

  return (
    <>
      <div className="mb-12">
        <h1 className="text-3xl font-headline font-bold text-on-surface tracking-tight mb-6">
          全部资产
        </h1>
        <div className="flex gap-6 border-b border-outline-variant/10">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className={`pb-4 text-sm font-medium transition-colors relative ${
                activeFilter === tab.key
                  ? 'text-primary font-bold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {tab.label}
              {activeFilter === tab.key && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl">
        {todayAssets.length > 0 && (
          <>
            <DateDivider label="今天" />
            {todayAssets.map((asset) => (
              <AssetItem key={asset.id} asset={asset} />
            ))}
          </>
        )}

        {yesterdayAssets.length > 0 && (
          <>
            <DateDivider label="昨天" />
            {yesterdayAssets.map((asset) => (
              <AssetItem key={asset.id} asset={asset} />
            ))}
          </>
        )}

        {filteredAssets.length === 0 && (
          <div className="mt-20 text-center py-12 border-2 border-dashed border-outline-variant/10 rounded-sm">
            <p className="text-sm text-on-surface-variant font-medium">
              暂无资产。试试搜索框来查找你的灵感。
            </p>
          </div>
        )}
      </div>
    </>
  )
}