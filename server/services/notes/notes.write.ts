import 'server-only'

type NoteLegacyWriteInput = {
  text: string
}

type NoteStructuredWriteInput = {
  rawInput: string
  title?: string | null
  content?: string | null
  summary?: string | null
}

export type NoteWriteInput = NoteLegacyWriteInput | NoteStructuredWriteInput

type NormalizedNoteWriteInput = {
  originalText: string
  title?: string | null
  content?: string | null
  summary?: string | null
  usesStructuredFields: boolean
}

function normalizeOptionalField(value?: string | null): string | null | undefined {
  if (value === undefined) {
    return undefined
  }

  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function normalizeOptionalMarkdownField(value?: string | null): string | null | undefined {
  if (value === undefined) {
    return undefined
  }

  return value && value.trim() ? value : null
}

export function normalizeNoteWriteInput(input: NoteWriteInput): NormalizedNoteWriteInput {
  const sourceText = 'rawInput' in input ? input.rawInput : input.text

  if (!sourceText.trim()) {
    throw new Error('EMPTY_INPUT')
  }

  const originalText = sourceText

  if ('rawInput' in input) {
    const normalizedContent = normalizeOptionalMarkdownField(input.content) ?? originalText

    return {
      originalText,
      title: normalizeOptionalField(input.title),
      content: normalizedContent,
      summary: normalizeOptionalField(input.summary),
      usesStructuredFields: true,
    }
  }

  return {
    originalText,
    usesStructuredFields: false,
  }
}
