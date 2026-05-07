const URL_REGEX = /https?:\/\/[^\s，,；;。]+/g
const SEPARATOR_REGEX = /[，,；;。]/g
const TODO_COMMAND_TYPO_PATTERNS: Array<[pattern: RegExp, replacement: string]> = [
  [/(记个|记一下|加个|加一下|创建|新建)(\s*)待半/g, '$1$2待办'],
  [/(记个|记一下|加个|加一下|创建|新建)(\s*)代办/g, '$1$2待办'],
]

export type NormalizedWorkspaceRunInput = {
  rawText: string
  normalizedText: string
  urls: string[]
  separators: string[]
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
  const correctedText = TODO_COMMAND_TYPO_PATTERNS.reduce(
    (text, [pattern, replacement]) => text.replace(pattern, replacement),
    rawText
  )
  const urlMatches = extractUrls(rawText)
  let normalizedText = ''
  let cursor = 0

  for (const match of urlMatches) {
    normalizedText += correctedText.slice(cursor, match.start)
    normalizedText += match.text
    cursor = match.end
  }

  normalizedText += correctedText.slice(cursor)

  return {
    rawText,
    normalizedText: normalizedText.trim(),
    urls: urlMatches.map((match) => match.text),
    separators: Array.from(rawText.matchAll(SEPARATOR_REGEX), (match) => match[0]),
  }
}
