"use client"

import Image from "next/image"
import { Bell, Settings, Search } from "lucide-react"

type TopAppBarProps = {
  userName: string
  userImage?: string | null
}

export function TopAppBar({ userName, userImage }: TopAppBarProps) {
  const fallbackInitial = userName.trim().slice(0, 1).toUpperCase() || 'G'

  return (
    <header className="h-14 w-full sticky top-0 bg-surface/80 backdrop-blur-sm flex items-center px-8 z-40 font-[family-name:var(--font-manrope)] tracking-tight text-sm border-b border-transparent">
      <div className="flex-1 max-w-xl mx-auto">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-on-surface-variant/50" />
          </div>
          <input
            className="w-full h-10 bg-surface-container-low rounded-full pl-11 pr-4 text-sm text-on-surface placeholder:text-on-surface-variant/40 shadow-[0_4px_16px_rgba(0,0,0,0.06)] border border-outline-variant/10 focus:outline-none focus:ring-2 focus:ring-primary/15 focus:shadow-[0_8px_24px_rgba(0,0,0,0.1)] transition-all duration-200"
            placeholder="搜索我的数字资产..."
            type="text"
          />
        </div>
      </div>
      <div className="flex items-center gap-1 ml-4">
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
        <div className="w-8 h-8 rounded-full bg-surface-container-high overflow-hidden cursor-pointer ml-2">
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
