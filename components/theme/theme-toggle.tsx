"use client"

import { Check, Monitor, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

const themeOptions = [
  { value: "system", label: "跟随系统", icon: Monitor },
  { value: "light", label: "浅色", icon: Sun },
  { value: "dark", label: "深色", icon: Moon },
] as const

type ThemeToggleProps = {
  className?: string
}

function ThemeToggle({ className }: ThemeToggleProps) {
  const { forcedTheme, resolvedTheme, setTheme, theme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const activeTheme = mounted ? theme ?? "system" : "system"
  const resolved = mounted ? resolvedTheme : undefined
  const TriggerIcon = resolved === "dark" ? Moon : resolved === "light" ? Sun : Monitor
  const disabled = Boolean(forcedTheme)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="切换主题"
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            disabled={disabled}
            className={cn(
              "rounded-full text-on-surface-variant transition-[background-color,color,transform] duration-200 hover:bg-muted hover:text-on-surface active:scale-[0.98]",
              className
            )}
          />
        }
      >
        <TriggerIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[156px] rounded-xl p-1.5">
        <DropdownMenuGroup>
          {themeOptions.map((option) => {
            const Icon = option.icon
            const selected = mounted && activeTheme === option.value

            return (
              <DropdownMenuItem
                key={option.value}
                onClick={() => setTheme(option.value)}
                disabled={disabled}
                className="gap-2 rounded-lg px-2.5 py-2 text-[12px]"
              >
                <Icon className="size-3.5 text-on-surface-variant" />
                <span>{option.label}</span>
                {selected ? <Check className="ml-auto size-3.5 text-primary" /> : null}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export { ThemeToggle }
