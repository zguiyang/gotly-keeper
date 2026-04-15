import 'server-only'

import { randomUUID } from 'node:crypto'

const DICEBEAR_AVATAR_URL = 'https://api.dicebear.com/9.x/bottts-neutral/png'

export function createDefaultAvatarUrl(seed = randomUUID()) {
  const url = new URL(DICEBEAR_AVATAR_URL)
  url.searchParams.set('seed', seed)
  return url.toString()
}