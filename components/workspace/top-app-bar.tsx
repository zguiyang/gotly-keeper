"use client"

import { Menu, XIcon } from "lucide-react"

import { AccountMenu } from "@/components/account-menu"
import { BrandLogo } from "@/components/brand-logo"
import { ThemeToggle } from "@/components/theme/theme-toggle"
import { Button } from "@/components/ui/button"
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { WorkspaceNavList } from "@/components/workspace/workspace-nav-list"
import { appVersion } from "@/config/app-meta"

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
            render={<Button variant="ghost" size="icon-lg" className="size-11 text-on-surface-variant hover:text-on-surface" />}
          >
            <Menu />
          </SheetTrigger>
            <SheetContent side="left" className="w-64 border-r border-border/15 bg-surface p-0" showCloseButton={false}>
              <SheetTitle className="sr-only">工作区导航</SheetTitle>
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between border-b border-border/15 px-3 py-4">
                  <BrandLogo className="h-9" />
                  <SheetClose render={<Button variant="ghost" size="icon" className="text-on-surface-variant hover:text-on-surface" />}>
                    <XIcon className="size-5" />
                  </SheetClose>
                </div>
                <nav className="flex-1 px-2 py-4">
                <WorkspaceNavList variant="sheet" />
              </nav>
              <div className="border-t border-border/15 px-4 py-6">
                <p className="text-xs font-medium text-on-surface-variant/80">Gotly Keeper</p>
                <p className="mt-1 text-xs leading-5 text-on-surface-variant/65">Version {appVersion}</p>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex min-w-0 flex-1 items-center">
        <p className="hidden truncate text-xs text-on-surface-variant/75 sm:block">
          一句话沉淀笔记、链接和待办，需要时直接找回
        </p>
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
