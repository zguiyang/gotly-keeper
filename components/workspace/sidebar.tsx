"use client"

import { WorkspaceNavList } from '@/components/workspace/workspace-nav-list'

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 z-50 hidden h-full w-64 flex-col border-r border-outline-variant/15 bg-surface-container-low/45 px-4 py-6 text-sm lg:flex">
      <div className="mb-10 px-2.5">
        <div className="font-headline text-[1.9rem] font-semibold tracking-[-0.04em] text-primary">Gotly AI</div>
        <div className="mt-1 text-[10px] uppercase tracking-[0.22em] text-on-surface-variant/75">
          Personal Curator
        </div>
      </div>

      <nav className="space-y-0.5 flex-1">
        <WorkspaceNavList variant="sidebar" />
      </nav>

      <div className="mt-auto rounded-2xl border border-outline-variant/12 bg-surface-container-lowest/80 px-4 py-4 shadow-[0_18px_40px_-32px_rgba(0,81,177,0.35)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant/65">
          Assistant
        </p>
        <p className="mt-2 text-sm leading-6 text-on-surface-variant">
          Gotly 小管家随时待命
        </p>
      </div>
    </aside>
  )
}
