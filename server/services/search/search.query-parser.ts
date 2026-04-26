import {
  KEYWORD_TERM_MIN_LENGTH,
  KEYWORD_TERM_MAX_COUNT,
  KEYWORD_LONG_TERM_THRESHOLD,
  KEYWORD_LONG_TERM_SCORE,
  KEYWORD_SHORT_TERM_SCORE,
  KEYWORD_TIME_HINT_BONUS,
  KEYWORD_TYPE_HINT_SCORE,
} from '@/server/lib/config/constants'

import type { AssetType } from './search.types'

const QUERY_FILLERS = [
  '帮我',
  '找一下',
  '查一下',
  '我',
  '最近',
  '上次',
  '之前',
  '保存过',
  '存过',
  '收藏过',
  '记过',
  '记录过',
  '关于',
  '内容',
  '在哪',
  '哪里',
  '有哪些',
  '什么',
  '一下',
  '的',
  '吗',
  '么',
]

const ASSET_TYPE_TERMS: Record<AssetType, string[]> = {
  note: ['记录', '笔记', '想法', '文案'],
  link: ['书签', '链接', '文章', '收藏', '资料'],
  todo: ['待办', '待处理', '任务', '事项', '要做'],
}

export function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[，。！？、,.!?;；:：()[\]{}"'`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function getAssetSearchTerms(query: string): string[] {
  let normalized = normalizeSearchText(query)

  for (const filler of QUERY_FILLERS) {
    normalized = normalized.replaceAll(filler, ' ')
  }

  return Array.from(
    new Set(
      normalized
        .split(/\s+/)
        .map((term) => term.trim())
        .filter((term) => term.length >= KEYWORD_TERM_MIN_LENGTH)
    )
  ).slice(0, KEYWORD_TERM_MAX_COUNT)
}

export function getTypeHintScore(query: string, type: AssetType): number {
  return ASSET_TYPE_TERMS[type].some((term) => query.includes(term))
    ? KEYWORD_TYPE_HINT_SCORE
    : 0
}

export function scoreAssetForQuery(
  asset: {
    originalText: string
    title?: string | null
    excerpt?: string | null
    url: string | null
    timeText: string | null
    type: AssetType
  },
  query: string,
  terms: string[]
): number {
  const searchable = normalizeSearchText(
    [
      asset.originalText,
      asset.title,
      asset.excerpt,
      asset.url,
      asset.timeText,
      ASSET_TYPE_TERMS[asset.type].join(' '),
    ]
      .filter(Boolean)
      .join(' ')
  )

  let score = getTypeHintScore(query, asset.type)

  for (const term of terms) {
    if (searchable.includes(term)) {
      score += term.length >= KEYWORD_LONG_TERM_THRESHOLD ? KEYWORD_LONG_TERM_SCORE : KEYWORD_SHORT_TERM_SCORE
    }
  }

  if (query.includes('这周') && asset.timeText?.includes('本周')) {
    score += KEYWORD_TIME_HINT_BONUS
  }

  return score
}
