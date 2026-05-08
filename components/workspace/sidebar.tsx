"use client"

import { BrandLogo } from '@/components/brand-logo'
import { WorkspaceNavList } from '@/components/workspace/workspace-nav-list'
import { appVersion } from '@/config/app-meta'

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 z-50 hidden h-full w-64 flex-col border-r border-border/15 bg-muted/45 px-4 py-6 text-sm lg:flex">
      <div className="mb-10 px-2.5">
        <BrandLogo className="h-9" />
      </div>

      <nav className="flex-1">
        <WorkspaceNavList variant="sidebar" />
      </nav>

      <div className="mt-8 px-2.5 text-[11px] leading-5 text-on-surface-variant/65">
        <p className="font-medium text-on-surface-variant/80">Gotly Keeper</p>
        <p>Version {appVersion}</p>
      </div>
    </aside>
  )
}
