"use client"

import { Languages } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useLocale } from "@/hooks/use-locale"

const LOCALE_OPTIONS = [
  { value: "en", label: "English", shortLabel: "EN" },
  { value: "zh-CN", label: "中文", shortLabel: "中" },
] as const

type LanguageSwitcherProps = {
  className?: string
}

export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const { locale, setLocale } = useLocale()

  const current = LOCALE_OPTIONS.find((opt) => opt.value === locale)
  const displayLabel = current?.label ?? "English"
  const shortLabel = current?.shortLabel ?? "EN"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Switch language"
        className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-[450] text-on-surface-variant no-underline transition-colors duration-150 hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${className ?? ""}`}
      >
        <Languages className="h-4 w-4" />
        <span className="max-sm:hidden">{displayLabel}</span>
        <span className="hidden max-sm:inline">{shortLabel}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[140px] rounded-xl p-1.5">
        <DropdownMenuRadioGroup
          value={locale}
          onValueChange={(value) => setLocale(value)}
        >
          {LOCALE_OPTIONS.map((opt) => (
            <DropdownMenuRadioItem
              key={opt.value}
              value={opt.value}
              className="gap-2 rounded-lg px-2.5 py-2 text-sm"
            >
              {opt.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
