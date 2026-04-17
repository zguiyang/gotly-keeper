"use client"

import { Bell, Settings, Search, Menu } from "lucide-react"
import Image from "next/image"

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { WorkspaceNavList } from "@/components/workspace/workspace-nav-list"

type TopAppBarProps = {
  userName: string
  userImage?: string | null
}

export function TopAppBar({ userName, userImage }: TopAppBarProps) {
  const fallbackInitial = userName.trim().slice(0, 1).toUpperCase() || 'G'

  return (
    <header className="h-14 w-full sticky top-0 bg-surface border-b border-outline-variant/20 flex items-center justify-between px-4 lg:px-8 z-40 font-[family-name:var(--font-manrope)] tracking-tight text-sm gap-4">
      {/* Mobile menu */}
      <div className="lg:hidden flex items-center shrink-0">
        <Sheet>
          <SheetTrigger
            aria-label="打开工作区导航"
            className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low rounded-sm transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
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
            className="w-full h-9 bg-white rounded-lg pl-10 pr-4 text-sm text-on-surface placeholder:text-on-surface-variant/40 border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all duration-200 shadow-sm"
            placeholder="快速查找..."
            type="text"
          />
        </div>
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low rounded-sm transition-colors duration-150 cursor-pointer"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5" />
        </button>
        <button
          className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low rounded-sm transition-colors duration-150 cursor-pointer"
          aria-label="Settings"
        >
          <Settings className="w-5 h-5" />
        </button>
        <div className="w-8 h-8 rounded-full bg-surface-container-high overflow-hidden cursor-pointer ml-1">
          {userImage ? (
            <Image
              alt={`${userName} 的头像`}
              className="h-full w-full object-cover"
              height={32}
              src={userImage}
              width={32}
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-sm font-medium text-primary">
              {fallbackInitial}
            </span>
          )}
        </div>
      </div>
    </header>
  )
}
