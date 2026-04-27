const URL_REGEX = /https?:\/\/[^\s，,；;。]+/g
const SEPARATOR_REGEX = /[，,；;。]/g
const HOUR_TEXT = '[0-9一二三四五六七八九十两]+'
const TIME_HINT_REGEX =
  new RegExp(
    `(今天|明天|后天)(上午|中午|下午|晚上|凌晨)?${HOUR_TEXT}[点时](?:半|[0-9一二三四五六七八九十两]+分)?|(今天|明天|后天)(上午|中午|下午|晚上|凌晨)|(下周[一二三四五六日天]?|本周[一二三四五六日天]?|周[一二三四五六日天])(上午|中午|下午|晚上|凌晨)?${HOUR_TEXT}?[点时]?(?:半|[0-9一二三四五六七八九十两]+分)?|[0-9一二三四五六七八九十两]+月[0-9一二三四五六七八九十两]+[日号]?(上午|中午|下午|晚上|凌晨)?${HOUR_TEXT}?[点时]?(?:半|[0-9一二三四五六七八九十两]+分)?`,
    'g'
  )

const TYPO_CORRECTIONS = [
  ['网止', '网址'],
  ['提行', '提醒'],
  ['prcing', 'pricing'],
] as const

export type WorkspaceRunTypoCandidate = {
  text: string
  suggestion: string
}

export type NormalizedWorkspaceRunInput = {
  rawText: string
  normalizedText: string
  urls: string[]
  separators: string[]
  typoCandidates: WorkspaceRunTypoCandidate[]
  timeHints: string[]
}

type UrlMatch = {
  start: number
  end: number
  text: string
}

function extractUrls(text: string): UrlMatch[] {
  return Array.from(text.matchAll(URL_REGEX), (match) => ({
    start: match.index ?? 0,
    end: (match.index ?? 0) + match[0].length,
    text: match[0],
  }))
}

export function normalizeWorkspaceRunInput(rawText: string): NormalizedWorkspaceRunInput {
  const urlMatches = extractUrls(rawText)
  let normalizedText = ''
  const typoCandidates: WorkspaceRunTypoCandidate[] = []
  let cursor = 0

  for (const match of urlMatches) {
    let segment = rawText.slice(cursor, match.start)

    for (const [from, to] of TYPO_CORRECTIONS) {
      if (!segment.includes(from)) {
        continue
      }

      segment = segment.replaceAll(from, to)
      if (!typoCandidates.some((candidate) => candidate.text === from)) {
        typoCandidates.push({ text: from, suggestion: to })
      }
    }

    normalizedText += segment
    normalizedText += match.text
    cursor = match.end
  }

  let tailSegment = rawText.slice(cursor)

  for (const [from, to] of TYPO_CORRECTIONS) {
    if (!tailSegment.includes(from)) {
      continue
    }

    tailSegment = tailSegment.replaceAll(from, to)
    if (!typoCandidates.some((candidate) => candidate.text === from)) {
      typoCandidates.push({ text: from, suggestion: to })
    }
  }

  normalizedText += tailSegment

  return {
    rawText,
    normalizedText: normalizedText.trim(),
    urls: urlMatches.map((match) => match.text),
    separators: Array.from(rawText.matchAll(SEPARATOR_REGEX), (match) => match[0]),
    typoCandidates,
    timeHints: Array.from(rawText.matchAll(TIME_HINT_REGEX), (match) => match[0].trim()),
  }
}
