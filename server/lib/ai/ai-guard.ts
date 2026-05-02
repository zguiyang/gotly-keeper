import 'server-only'

type ContentGuardResult = {
  passed: boolean
  sanitized: string
  warnings: string[]
}

const INTERNAL_KEYWORDS = [
  'slotEntries',
  'draftTask',
  'assetType',
  'typeHint',
  'publicReason',
  'normalizedRequest',
  'rawInputPreview',
]

export function validateComposeOutput(output: string): ContentGuardResult {
  const warnings: string[] = []

  for (const kw of INTERNAL_KEYWORDS) {
    if (output.toLowerCase().includes(kw.toLowerCase())) {
      warnings.push(`Output contains internal keyword: "${kw}"`)
    }
  }

  const hasCJK = /[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/.test(output)
  const hasLatin = /[a-zA-Z]{4,}/.test(output)
  if (hasCJK && hasLatin) {
    warnings.push('Mixed language detected: output contains both CJK and Latin text')
  }

  let sanitized = output
  if (sanitized.length > 600) {
    sanitized = sanitized.slice(0, 597) + '...'
    warnings.push(`Output truncated from ${output.length} to 600 chars`)
  }

  return { passed: warnings.length === 0, sanitized, warnings }
}

export function validateInsightOutput(output: string): ContentGuardResult {
  const warnings: string[] = []

  if (output.length > 200) {
    warnings.push(`Insight output exceeds 200 char limit (${output.length})`)
  }

  return {
    passed: warnings.length === 0,
    sanitized: output.slice(0, 200),
    warnings,
  }
}
