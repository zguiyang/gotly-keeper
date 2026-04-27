"use client"

import { Command, Menu, Sparkles } from "lucide-react"

import { AccountMenu } from "@/components/account-menu"
import { BrandLogo } from "@/components/brand-logo"
import { ThemeToggle } from "@/components/theme/theme-toggle"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { WorkspaceNavList } from "@/components/workspace/workspace-nav-list"

type TopAppBarProps = {
  userName: string
  userEmail?: string | null
  userImage?: string | null
}

export function TopAppBar({ userName, userEmail, userImage }: TopAppBarProps) {
  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between gap-4 border-b border-border/15 bg-surface/88 px-4 text-sm backdrop-blur-xl lg:px-8">
      <div className="lg:hidden flex items-center shrink-0">
        <Sheet>
          <SheetTrigger
            aria-label="打开工作区导航"
            render={<Button variant="ghost" size="icon-lg" className="text-on-surface-variant hover:text-on-surface" />}
          >
            <Menu />
          </SheetTrigger>
            <SheetContent side="left" className="w-64 border-r border-border/15 bg-surface p-0">
              <SheetTitle className="sr-only">工作区导航</SheetTitle>
              <div className="flex h-full flex-col">
                <div className="border-b border-border/15 px-4 py-6">
                  <BrandLogo className="h-9" />
                </div>
                <nav className="flex-1 px-2 py-4">
                <WorkspaceNavList variant="sheet" />
              </nav>
              <div className="border-t border-border/15 px-4 py-6">
                <p className="text-sm leading-6 text-on-surface-variant">
                  一句话就能保存、整理或找回内容。
                </p>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="hidden h-8 items-center gap-2 rounded-full border border-border/10 bg-surface-container-lowest/80 px-3 text-xs font-medium text-on-surface-variant shadow-[var(--shadow-elevation-1)] sm:inline-flex">
          <Sparkles className="size-3.5 text-primary" />
          工作区已就绪
        </span>
        <span className="hidden items-center gap-1.5 text-xs text-on-surface-variant/75 lg:inline-flex">
          <Command className="size-3.5" />
          在启动台输入即可捕获或查询
        </span>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <ThemeToggle />
        <AccountMenu
          className="ml-1"
          signedOutRedirectTo="/auth/sign-in"
          userEmail={userEmail}
          userImage={userImage}
          userName={userName}
        />
      </div>
    </header>
  )
}
