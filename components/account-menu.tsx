"use client"

import { LogOut, UserRound } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { authClient } from "@/lib/auth-client"
import { cn } from "@/lib/utils"

type AccountMenuProps = {
  userName: string
  userEmail?: string | null
  userImage?: string | null
  signedOutRedirectTo?: string
  className?: string
}

export function AccountMenu({
  userName,
  userEmail,
  userImage,
  signedOutRedirectTo,
  className,
}: AccountMenuProps) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const fallbackInitial = userName.trim().slice(0, 1).toUpperCase() || "G"

  async function handleSignOut() {
    if (pending) {
      return
    }

    setPending(true)

    try {
      await authClient.signOut()

      if (signedOutRedirectTo) {
        router.replace(signedOutRedirectTo)
      }

      router.refresh()
    } finally {
      setPending(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="打开账号菜单"
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            className={cn(
              "rounded-full p-0 text-on-surface-variant hover:bg-muted hover:text-on-surface",
              className
            )}
          />
        }
      >
        <span className="flex size-9 items-center justify-center overflow-hidden rounded-full border border-border/10 bg-muted shadow-[var(--shadow-elevation-2)]">
          {userImage ? (
            <Image
              alt={`${userName} 的头像`}
              className="size-full object-cover"
              height={36}
              sizes="36px"
              src={userImage}
              width={36}
            />
          ) : (
            <span className="text-sm font-medium text-primary">{fallbackInitial}</span>
          )}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[232px] rounded-xl p-1.5">
        <div className="flex items-center gap-3 px-2.5 py-2.5">
          <div className="flex size-10 items-center justify-center overflow-hidden rounded-full border border-border/10 bg-muted">
            {userImage ? (
              <Image
                alt={`${userName} 的头像`}
                className="size-full object-cover"
                height={40}
                sizes="40px"
                src={userImage}
                width={40}
              />
            ) : (
              <span className="text-sm font-medium text-primary">{fallbackInitial}</span>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-on-surface">{userName}</p>
            <p className="truncate text-xs text-on-surface-variant">
              {userEmail ?? "已登录 Gotly AI"}
            </p>
          </div>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem
            className="gap-2 rounded-lg px-2.5 py-2 text-[12px]"
            disabled
          >
            <UserRound className="size-3.5 text-on-surface-variant" />
            当前账号
          </DropdownMenuItem>
          <DropdownMenuItem
            className="gap-2 rounded-lg px-2.5 py-2 text-[12px]"
            disabled={pending}
            onClick={handleSignOut}
            variant="destructive"
          >
            <LogOut className="size-3.5" />
            {pending ? "退出中..." : "退出登录"}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
