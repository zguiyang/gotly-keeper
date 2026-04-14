const URL_REGEX = /https?:\/\/[^\s]+/g

function extractUrl(text: string): string | null {
  const matches = text.match(URL_REGEX)
  return matches ? matches[0] : null
}

export type AssetSummaryTarget =
  | 'unfinished_todos'
  | 'recent_notes'
  | 'recent_bookmarks'

export type ExplicitSummaryIntent = {
  summaryTarget: AssetSummaryTarget
}

const SUMMARY_WORDS = ['总结', '摘要', '概括', '复盘']
const RECENT_WORDS = ['最近', '近期', '刚才']
const NOTE_WORDS = ['笔记', '记录']
const BOOKMARK_WORDS = ['书签', '链接', '收藏']
const TODO_WORDS = ['待办', '任务']
const UNFINISHED_WORDS = ['未完成', '没完成', '还没', '待处理']

function includesAny(text: string, words: readonly string[]) {
  return words.some((word) => text.includes(word))
}

export function detectExplicitSummaryIntent(
  text: string
): ExplicitSummaryIntent | null {
  const normalized = text.trim()
  if (!normalized || extractUrl(normalized)) return null
  if (!includesAny(normalized, SUMMARY_WORDS)) return null

  if (
    includesAny(normalized, TODO_WORDS) &&
    (includesAny(normalized, UNFINISHED_WORDS) || normalized.includes('复盘'))
  ) {
    return { summaryTarget: 'unfinished_todos' }
  }

  if (
    includesAny(normalized, NOTE_WORDS) &&
    (includesAny(normalized, RECENT_WORDS) || normalized.includes('总结'))
  ) {
    return { summaryTarget: 'recent_notes' }
  }

  if (
    includesAny(normalized, BOOKMARK_WORDS) &&
    (includesAny(normalized, RECENT_WORDS) || normalized.includes('总结'))
  ) {
    return { summaryTarget: 'recent_bookmarks' }
  }

  return null
}

export function resolveExplicitSummaryTarget(text: string): AssetSummaryTarget | null {
  return detectExplicitSummaryIntent(text)?.summaryTarget ?? null
}
