import { getTranslations } from "next-intl/server"

import en from "@/locales/en.json"

// 递归取深层路径：resolveKey({ a: { b: "c" } }, "a.b") → "c"
function resolveKey(obj: Record<string, unknown>, path: string): string {
  const keys = path.split(".")
  let current: Record<string, unknown> | null | undefined = obj
  for (const key of keys) {
    if (current == null || typeof current !== "object") return path
    current = current[key] as Record<string, unknown> | undefined
  }
  return typeof current === "string" ? current : path
}

/**
 * 获取翻译函数，自动降级：
 * 1. 优先使用 next-intl 的请求上下文（API Route / Server Action 调用时）
 * 2. 无请求上下文时直接读取 en.json 静态导入（后台任务 / 测试时）
 *
 * 命名含 "Safe" 后缀以区别于 hooks/use-locale.server.ts 的同名函数（后者无 fallback），
 * 避免开发者在 API Route / Server Action 等有请求上下文的位置误用此版本。
 */
export async function getServerTranslationSafe(namespace: string) {
  try {
    return await getTranslations(namespace)
  } catch {
    // 无请求上下文，直接从 en.json 读，key 不存在时返回 key 本身
    return (key: string) => resolveKey(en, `${namespace}.${key}`)
  }
}
