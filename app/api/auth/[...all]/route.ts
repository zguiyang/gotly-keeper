import { toNextJsHandler } from 'better-auth/next-js'

// TODO: 后续可做薄封装：在 `server/modules/auth/handler.ts` 导出 `{ GET, POST }`，
// 这里仅 re-export，以减少 `app` 对 `server/lib` 的直接依赖。
import { auth } from '@/server/lib/auth'

export const { GET, POST } = toNextJsHandler(auth)
