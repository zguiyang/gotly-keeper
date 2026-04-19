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

export function normalizeNoteWriteInput(input: NoteWriteInput): NormalizedNoteWriteInput {
  const originalText = ('rawInput' in input ? input.rawInput : input.text).trim()

  if (!originalText) {
    throw new Error('EMPTY_INPUT')
  }

  if ('rawInput' in input) {
    return {
      originalText,
      title: normalizeOptionalField(input.title),
      content: normalizeOptionalField(input.content),
      summary: normalizeOptionalField(input.summary),
      usesStructuredFields: true,
    }
  }

  return {
    originalText,
    usesStructuredFields: false,
  }
}
