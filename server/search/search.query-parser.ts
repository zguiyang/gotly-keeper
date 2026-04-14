import type { AssetType } from './search.types'

const QUERY_FILLERS = [
  '帮我',
  '找一下',
  '查一下',
  '我',
  '最近',
  '上次',
  '之前',
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
        .filter((term) => term.length >= 2)
    )
  ).slice(0, 8)
}

export function getTypeHintScore(query: string, type: AssetType): number {
  return ASSET_TYPE_TERMS[type].some((term) => query.includes(term)) ? 2 : 0
}

export function scoreAssetForQuery(
  asset: { originalText: string; url: string | null; timeText: string | null; type: AssetType },
  query: string,
  terms: string[]
): number {
  const searchable = normalizeSearchText(
    [
      asset.originalText,
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
      score += term.length >= 4 ? 3 : 2
    }
  }

  if (query.includes('这周') && asset.timeText?.includes('本周')) {
    score += 2
  }

  return score
}
