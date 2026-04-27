"use client"

import { BrandLogo } from '@/components/brand-logo'
import { WorkspaceNavList } from '@/components/workspace/workspace-nav-list'

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 z-50 hidden h-full w-64 flex-col border-r border-border/15 bg-muted/45 px-4 py-6 text-sm lg:flex">
      <div className="mb-10 px-2.5">
        <BrandLogo className="h-9" />
      </div>

      <nav className="flex-1">
        <WorkspaceNavList variant="sidebar" />
      </nav>

      <div className="mt-8 rounded-3xl border border-border/12 bg-surface-container-lowest/80 px-4 py-4 shadow-[var(--shadow-elevation-3)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant/80">
          统一入口
        </p>
        <p className="mt-2 text-sm leading-6 text-on-surface-variant">
          一句话就能保存、整理或找回内容。
        </p>
      </div>
    </aside>
  )
}
