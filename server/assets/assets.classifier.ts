export type AssetInputType = 'note' | 'link' | 'todo'

import { parseAssetTimeText } from './assets.time'

export type AssetClassification = {
  kind: 'asset'
  type: AssetInputType
  url: string | null
  timeText: string | null
  dueAt: Date | null
}

export type QueryClassification = {
  kind: 'query'
}

export type InputClassification = AssetClassification | QueryClassification

const URL_REGEX = /https?:\/\/[^\s]+/g

export function extractUrl(text: string): string | null {
  const matches = text.match(URL_REGEX)
  return matches ? matches[0] : null
}

const QUERY_KEYWORDS = ['查询', '最近记过', '在哪', '有哪些', '找一下', '查一下', '帮我找']
const QUERY_SUFFIXES = ['吗', '么']

export function isObviousQuery(text: string): boolean {
  if (text.startsWith('找')) {
    return true
  }
  if (QUERY_KEYWORDS.some((kw) => text.includes(kw))) {
    return true
  }
  if (QUERY_SUFFIXES.some((suffix) => text.endsWith(suffix))) {
    return true
  }
  return false
}

const TODO_KEYWORDS = ['记得', '提醒', '待办', '要', '处理', '发', '提交', '整理', '预订', '回复']

export function hasTodoIntent(text: string): boolean {
  return TODO_KEYWORDS.some((kw) => text.includes(kw))
}

export function classifyAssetInput(text: string): InputClassification {
  if (isObviousQuery(text)) {
    return { kind: 'query' }
  }

  const url = extractUrl(text)
  if (url) {
    const parsedTime = parseAssetTimeText(text)
    return {
      kind: 'asset',
      type: 'link',
      url,
      timeText: parsedTime.timeText,
      dueAt: parsedTime.dueAt,
    }
  }

  if (hasTodoIntent(text)) {
    const parsedTime = parseAssetTimeText(text)
    return {
      kind: 'asset',
      type: 'todo',
      url: null,
      timeText: parsedTime.timeText,
      dueAt: parsedTime.dueAt,
    }
  }

  return {
    kind: 'asset',
    type: 'note',
    url: null,
    timeText: null,
    dueAt: null,
  }
}
