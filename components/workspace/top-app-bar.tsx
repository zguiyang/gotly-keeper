"use client"

import { Bell, Settings, Search, Menu } from "lucide-react"

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { WorkspaceNavList } from "@/components/workspace/workspace-nav-list"

type TopAppBarProps = {
  userName: string
  userImage?: string | null
}

export function TopAppBar({ userName, userImage }: TopAppBarProps) {
  const fallbackInitial = userName.trim().slice(0, 1).toUpperCase() || 'G'

  return (
    <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between gap-4 border-b border-outline-variant/20 bg-surface px-4 text-sm tracking-tight lg:px-8 font-headline">
      {/* Mobile menu */}
      <div className="lg:hidden flex items-center shrink-0">
        <Sheet>
          <SheetTrigger
            aria-label="打开工作区导航"
            className="rounded-sm p-2 text-on-surface-variant transition-colors duration-150 hover:bg-surface-container-low hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            <Menu className="w-5 h-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0 bg-surface border-r border-outline-variant/20">
            <div className="flex flex-col h-full">
              <div className="px-4 py-6 border-b border-outline-variant/20">
                <div className="text-xl font-bold text-primary tracking-tight">Gotly AI</div>
                <div className="text-[10px] text-on-surface-variant uppercase tracking-widest mt-0.5">
                  Personal Curator
                </div>
              </div>
              <nav className="flex-1 px-2 py-4 space-y-0.5">
                <WorkspaceNavList variant="sheet" />
              </nav>
              <div className="px-4 py-6 border-t border-outline-variant/20">
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Gotly 小管家随时待命
                </p>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Search - left side */}
      <div className="flex-1 max-w-xs lg:max-w-sm shrink-0">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-on-surface-variant/60" />
          </div>
          <input
            aria-label="快速查找"
            className="h-9 w-full rounded-lg border border-outline-variant/30 bg-white pl-10 pr-4 text-sm text-on-surface shadow-sm transition-[border-color,box-shadow] duration-200 placeholder:text-on-surface-variant/40 focus:outline-none focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/20"
            name="topbar-search"
            placeholder="快速查找…"
            type="text"
          />
        </div>
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          className="rounded-sm p-2 text-on-surface-variant transition-colors duration-150 hover:bg-surface-container-low hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          aria-label="通知"
        >
          <Bell className="w-5 h-5" />
        </button>
        <button
          className="rounded-sm p-2 text-on-surface-variant transition-colors duration-150 hover:bg-surface-container-low hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          aria-label="设置"
        >
          <Settings className="w-5 h-5" />
        </button>
        <div className="ml-1 flex size-8 items-center justify-center overflow-hidden rounded-full bg-surface-container-high">
          {userImage ? (
            <img
              alt={`${userName} 的头像`}
              className="size-full object-cover"
              height={32}
              loading="lazy"
              src={userImage}
              width={32}
            />
          ) : (
            <span className="text-sm font-medium text-primary">{fallbackInitial}</span>
          )}
        </div>
      </div>
    </header>
  )
}
