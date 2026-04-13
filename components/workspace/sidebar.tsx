"use client"

import { Bot, Package, Bookmark, CheckSquare, FileText } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

const navItems = [
  { icon: Bot, label: "启动台", href: "/workspace" },
  { icon: FileText, label: "普通记录", href: "/workspace/notes" },
  { icon: CheckSquare, label: "待办", href: "/workspace/todos" },
  { icon: Bookmark, label: "书签", href: "/workspace/bookmarks" },
  { icon: Package, label: "知识库", href: "/workspace/all" },
]

export function Sidebar() {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === "/workspace") {
      return pathname === "/workspace"
    }
    return pathname.startsWith(href)
  }

  return (
    <aside className="fixed left-0 top-0 h-full w-64 hidden lg:flex flex-col py-6 px-4 font-[family-name:var(--font-manrope)] text-sm z-50 bg-surface border-r border-outline-variant/20">
      <div className="mb-10 px-2">
        <div className="text-xl font-bold text-primary tracking-tight">Gotly AI</div>
        <div className="text-[10px] text-on-surface-variant uppercase tracking-widest mt-0.5">
          Personal Curator
        </div>
      </div>

      <nav className="space-y-0.5 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          return (
            <Link
              key={item.label}
              className={`group relative flex items-center gap-3 px-3 py-2 rounded-sm transition-colors duration-150 ${
                active
                  ? "text-primary font-medium bg-primary/5"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low"
              }`}
              href={item.href}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r" />
              )}
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto pt-6 px-2">
        <p className="text-xs text-on-surface-variant leading-relaxed">
          Gotly 小管家随时待命
        </p>
      </div>
    </aside>
  )
}
