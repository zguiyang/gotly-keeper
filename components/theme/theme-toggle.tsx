"use client"

import { Monitor, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import * as React from "react"

import { Button } from "@/components/ui/button"
import { useTranslations } from "@/hooks/use-locale"
import { cn } from "@/lib/utils"

type ThemeToggleProps = {
  className?: string
}

const themeOptions = [
  { value: "system", icon: Monitor },
  { value: "light", icon: Sun },
  { value: "dark", icon: Moon },
] as const

function ThemeToggle({ className }: ThemeToggleProps) {
  const t = useTranslations("theme")
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" aria-label={t("toggleLabel")} disabled>
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
      aria-label={t("toggleLabel")}
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
