"use client"

import { WorkspaceNavList } from '@/components/workspace/workspace-nav-list'

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-full w-64 hidden lg:flex flex-col py-6 px-4 font-[family-name:var(--font-manrope)] text-sm z-50 bg-surface border-r border-outline-variant/20">
      <div className="mb-10 px-2">
        <div className="text-xl font-bold text-primary tracking-tight">Gotly AI</div>
        <div className="text-[10px] text-on-surface-variant uppercase tracking-widest mt-0.5">
          Personal Curator
        </div>
      </div>

      <nav className="space-y-0.5 flex-1">
        <WorkspaceNavList variant="sidebar" />
      </nav>

      <div className="mt-auto pt-6 px-2">
        <p className="text-xs text-on-surface-variant leading-relaxed">
          Gotly 小管家随时待命
        </p>
      </div>
    </aside>
  )
}
