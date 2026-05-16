"use client"

import { Monitor, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import * as React from "react"

import { Button } from "@/components/ui/button"
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
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" aria-label="切换主题" disabled>
        <Sun />
      </Button>
    )
  }

  const current = theme === "system" ? resolvedTheme : theme
  const currentIcon = current === "dark" ? Moon : current === "light" ? Sun : Monitor
  const IconComponent = currentIcon

  const cycle = () => {
    const nextIndex = (themeOptions.findIndex((o) => o.value === theme) + 1) % themeOptions.length
    setTheme(themeOptions[nextIndex].value)
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-lg"
      aria-label="切换主题"
      onClick={cycle}
      className={cn(
        "rounded-full text-on-surface-variant transition-[background-color,color,transform] duration-200 hover:bg-muted hover:text-on-surface active:scale-[0.98]",
        className
      )}
    >
      <IconComponent />
    </Button>
  )
}

export { ThemeToggle }
