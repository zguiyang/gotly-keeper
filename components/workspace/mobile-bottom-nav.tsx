"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { workspaceNavGroups, isWorkspaceNavItemActive } from "@/config/workspace/nav"
import { useTranslations } from "@/hooks/use-locale"

const MOBILE_NAV_HREFS = new Set(["/workspace/all", "/workspace/notes", "/workspace/bookmarks", "/workspace/todos"])

export function MobileBottomNav() {
  const t = useTranslations('workspace.nav')
  const pathname = usePathname()

  const items = workspaceNavGroups
    .flatMap((g) => g.items)
    .filter((item) => MOBILE_NAV_HREFS.has(item.href))

  if (items.length === 0) return null

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/15 bg-surface/92 backdrop-blur-xl pb-[env(safe-area-inset-bottom,0px)] lg:hidden"
      role="navigation"
      aria-label={t('mobileNavLabel')}
    >
      <div className="flex items-center justify-around h-14">
        {items.map((item) => {
          const Icon = item.icon
          const active = isWorkspaceNavItemActive(pathname, item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1 h-full py-1 text-[10px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-inset ${
                active
                  ? "text-primary"
                  : "text-on-surface-variant/70 hover:text-on-surface"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span className="truncate max-w-[4rem]">{t(item.tKey)}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
