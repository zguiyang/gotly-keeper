"use client"

import { useRouter } from "next/navigation"
import { useLocale as useNextIntlLocale, useTranslations } from "next-intl"
import { useCallback } from "react"

import { dayjs } from "@/shared/time/dayjs"

export { useTranslations }

// Enhanced useLocale: switch locale via cookie + refresh + sync dayjs locale
export function useLocale() {
  const locale = useNextIntlLocale()
  const router = useRouter()

  const setLocale = useCallback(
    (next: string) => {
      document.cookie = `NEXT_LOCALE=${next}; path=/; max-age=31536000`
      // Sync dayjs locale for relative time formatting
      try { dayjs.locale(next === "zh-CN" ? "zh-cn" : "en") } catch {}
      router.refresh()
    },
    [router],
  )

  return { locale, setLocale }
}
