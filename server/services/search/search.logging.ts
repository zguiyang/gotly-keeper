import 'server-only'

import { buildSearchPathLog, type SearchPathLogInput } from './search.logging.pure'

export function logSearchPath(input: SearchPathLogInput) {
  console.info('[search] Path selected', buildSearchPathLog(input))
}
