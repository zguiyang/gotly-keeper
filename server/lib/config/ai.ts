import 'server-only'

export const TODO_REVIEW_LIMIT = 10
export const NOTE_SUMMARY_LIMIT = 10
export const BOOKMARK_SUMMARY_LIMIT = 10

export const TODO_REVIEW_MODEL_TIMEOUT_MS = 6_000
export const NOTE_SUMMARY_MODEL_TIMEOUT_MS = 6_000
export const BOOKMARK_SUMMARY_MODEL_TIMEOUT_MS = 6_000
export const WORKSPACE_TASK_PARSE_TIMEOUT_MS = 60_000
export const ASSET_INPUT_MODEL_TIMEOUT_MS = 5_000

export const AI_MAX_RETRIES = 1
export const AI_TEMPERATURE = 0

export const AI_CONFIDENCE_THRESHOLD = 0.5

// Enable extended reasoning for complex multi-step tasks.
// false for simple extraction/generation, true for classification/reasoning/tool-chain.
export const AI_ENABLE_THINKING = {
  normalize: false,
  understand: true,
  plan: true,
  timeResolver: true,
  compose: false,
  insight: false,
} as const
