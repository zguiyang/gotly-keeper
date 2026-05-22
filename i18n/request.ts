import { cookies } from "next/headers"
import { getRequestConfig } from "next-intl/server"

const SUPPORTED_LOCALES = ["en", "zh-CN"] as const
type Locale = (typeof SUPPORTED_LOCALES)[number]

export default getRequestConfig(async () => {
  try {
    const cookieStore = await cookies()
    const raw = cookieStore.get("NEXT_LOCALE")?.value
    const locale: Locale = SUPPORTED_LOCALES.includes(raw as Locale)
      ? (raw as Locale)
      : "en"

    return {
      locale,
      messages: (await import(`../locales/${locale}.json`)).default,
    }
  } catch {
    // cookies() 可能抛出异常（无请求上下文等极端情况），兜底到默认语言
    return {
      locale: "en" as Locale,
      messages: (await import("../locales/en.json")).default,
    }
  }
})
