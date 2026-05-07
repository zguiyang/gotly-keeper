const URL_REGEX = /https?:\/\/[^\s，,；;。]+/g
const SEPARATOR_REGEX = /[，,；;。]/g

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
  const urlMatches = extractUrls(rawText)
  let normalizedText = ''
  let cursor = 0

  for (const match of urlMatches) {
    normalizedText += rawText.slice(cursor, match.start)
    normalizedText += match.text
    cursor = match.end
  }

  normalizedText += rawText.slice(cursor)

  return {
    rawText,
    normalizedText: normalizedText.trim(),
    urls: urlMatches.map((match) => match.text),
    separators: Array.from(rawText.matchAll(SEPARATOR_REGEX), (match) => match[0]),
  }
}
