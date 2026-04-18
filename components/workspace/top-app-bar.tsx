"use client"

import { Bell, Settings, Search, Menu } from "lucide-react"
import Image from "next/image"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { WorkspaceNavList } from "@/components/workspace/workspace-nav-list"

type TopAppBarProps = {
  userName: string
  userImage?: string | null
}

export function TopAppBar({ userName, userImage }: TopAppBarProps) {
  const fallbackInitial = userName.trim().slice(0, 1).toUpperCase() || 'G'

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between gap-4 border-b border-outline-variant/15 bg-surface/88 px-4 text-sm backdrop-blur-xl lg:px-8">
      <div className="lg:hidden flex items-center shrink-0">
        <Sheet>
          <SheetTrigger
            aria-label="打开工作区导航"
            render={<Button variant="ghost" size="icon-lg" className="text-on-surface-variant hover:text-on-surface" />}
          >
            <Menu />
          </SheetTrigger>
          <SheetContent side="left" className="w-64 border-r border-outline-variant/15 bg-surface p-0">
            <SheetTitle className="sr-only">工作区导航</SheetTitle>
            <div className="flex flex-col h-full">
              <div className="border-b border-outline-variant/15 px-4 py-6">
                <div className="font-headline text-[1.9rem] font-semibold tracking-[-0.04em] text-primary">Gotly AI</div>
                <div className="mt-1 text-[10px] uppercase tracking-[0.22em] text-on-surface-variant/75">
                  Personal Curator
                </div>
              </div>
              <nav className="flex-1 px-2 py-4 space-y-0.5">
                <WorkspaceNavList variant="sheet" />
              </nav>
              <div className="border-t border-outline-variant/15 px-4 py-6">
                <p className="text-sm leading-6 text-on-surface-variant">
                  Gotly 小管家随时待命
                </p>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex-1 max-w-xs lg:max-w-sm shrink-0">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-on-surface-variant/60" />
          </div>
          <Input
            aria-label="快速查找"
            className="h-10 w-full rounded-2xl border border-outline-variant/20 bg-surface-container-lowest/95 pl-10 pr-4 text-sm text-on-surface shadow-[0_16px_36px_-30px_rgba(0,81,177,0.3)] transition-[border-color,box-shadow] duration-200 placeholder:text-on-surface-variant/40 focus:outline-none focus-visible:border-primary/35 focus-visible:ring-2 focus-visible:ring-primary/15"
            name="topbar-search"
            placeholder="快速查找…"
            type="text"
          />
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="ghost"
          size="icon-lg"
          className="text-on-surface-variant hover:text-on-surface"
          aria-label="通知"
        >
          <Bell />
        </Button>
        <Button
          variant="ghost"
          size="icon-lg"
          className="text-on-surface-variant hover:text-on-surface"
          aria-label="设置"
        >
          <Settings />
        </Button>
        <div className="ml-1 flex size-9 items-center justify-center overflow-hidden rounded-full border border-outline-variant/10 bg-surface-container-high shadow-[0_14px_28px_-24px_rgba(0,81,177,0.28)]">
          {userImage ? (
            <Image
              alt={`${userName} 的头像`}
              className="size-full object-cover"
              height={32}
              sizes="32px"
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
