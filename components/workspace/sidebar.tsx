"use client"

import { Bot, Package, Bookmark, CheckSquare } from "lucide-react"

const navItems = [
  { icon: Bot, label: "助手", href: "#", active: true },
  { icon: Package, label: "全部", href: "#" },
  { icon: Bookmark, label: "收藏", href: "#" },
  { icon: CheckSquare, label: "待办", href: "#" },
]

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-surface border-r border-outline-variant/20 flex flex-col py-6 px-4 font-[family-name:var(--font-manrope)] text-sm z-50">
      <div className="mb-10 px-2">
        <div className="text-xl font-bold text-primary tracking-tight">Gotly AI</div>
        <div className="text-[10px] text-on-surface-variant uppercase tracking-widest mt-0.5">
          Personal Curator
        </div>
      </div>

      <nav className="space-y-0.5 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <a
              key={item.label}
              className={`flex items-center gap-3 px-3 py-2 rounded-sm transition-colors duration-150 ${
                item.active
                  ? "text-primary font-medium bg-primary/5"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low"
              }`}
              href={item.href}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </a>
          )
        })}
      </nav>

      <div className="mt-auto pt-6 px-2">
        <p className="text-xs text-on-surface-variant leading-relaxed">
          AI 正在为您整理 12 条新灵感。
        </p>
      </div>
    </aside>
  )
}
