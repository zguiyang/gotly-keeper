import { getLocale, getMessages, getTranslations } from "next-intl/server"

// 获取当前 locale 标识（用于 html lang 属性等）
export const getServerLocale = getLocale

// 获取全部消息（用于 NextIntlClientProvider）
export const getServerMessages = getMessages

// 获取命名空间翻译函数
// 用法: const t = await getServerTranslation('auth.signIn'); t('title')
export const getServerTranslation = getTranslations
