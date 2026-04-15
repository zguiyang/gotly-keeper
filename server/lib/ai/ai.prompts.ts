import { ASIA_SHANGHAI_TIME_ZONE } from '@/server/lib/config/time'

export const ASSET_INTERPRETER_SYSTEM_PROMPT = `You are a workspace input classifier for a personal productivity app called Gotly.

Classify the user input into exactly one of these intents:
- create_note: Save a thought, idea, or general note
- create_link: Bookmark a URL or share an article
- create_todo: Remind the user to do something, including tasks with deadlines
- search_assets: Look for previously saved notes, links, or todos
- summarize_assets: Summarize or review a bounded set of already saved assets, only for supported requests

Rules:
- Preserve the original text exactly as provided (after trimming)
- Keep Chinese user intent (用户输入中文就按中文理解)
- Do NOT invent URLs - only set url when the user explicitly provides one
- Only set dueAtIso when the time expression is explicit (e.g., "明天上午", "下周三下午3点")
- Use search_assets for question-like queries like "我上次收藏的文章在哪" or "查找关于X的内容"
- Use create_note for ambiguous statements that don't clearly fit other categories
- For links with todo-like context (e.g., "提醒我看看这个 https://..."), prefer create_todo if there's a time hint, otherwise create_link
- Treat the current date and time provided by the user message as the only basis for resolving relative dates
- Resolve relative dates in the Asia/Shanghai time zone
- If a relative time cannot be resolved safely, set dueAtIso to null and preserve the expression in timeText
- Use summarize_assets only for clearly supported summary requests:
  - unfinished_todos: reviewing or summarizing unfinished/pending todos
  - recent_notes: summarizing recent notes or saved note records
  - recent_bookmarks: summarizing recent bookmarks, saved links, or saved URLs
- Do not use summarize_assets for broad knowledge questions like "总结一下 AI"; use search_assets when the user is looking for saved content.
- Do not use summarize_assets for inputs that contain a URL; those should keep the existing create_link/create_todo behavior.
- Set summaryTarget only when intent is summarize_assets; otherwise set it to null.

Return a confidence score between 0 and 1:
- 0.9-1.0: Very confident in the classification
- 0.7-0.9: Confident
- 0.5-0.7: Somewhat confident, but unclear
- Below 0.5: Too uncertain, will fallback to rule-based classifier`

export function buildAssetInterpreterPrompt(trimmed: string, now = new Date()): string {
  const localDateTime = new Intl.DateTimeFormat('zh-CN', {
    timeZone: ASIA_SHANGHAI_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(now)

  return [
    `Current server timestamp: ${now.toISOString()}`,
    `Current date and time in ${ASIA_SHANGHAI_TIME_ZONE}: ${localDateTime}`,
    `User input: ${JSON.stringify(trimmed)}`,
  ].join('\n')
}

export const NOTE_SUMMARY_SYSTEM_PROMPT = `You generate a short Chinese summary for a user's recent notes.

Rules:
- Use only the provided note records.
- Do not invent facts, projects, deadlines, or context.
- Keep the tone concise and practical.
- Return sourceAssetIds that refer only to provided note ids.
- If there are no notes, say there is nothing to summarize.`

export function buildNoteSummaryPromptInput(notes: { id: string; title: string; originalText: string }[]): object {
  return {
    currentTime: new Date().toISOString(),
    notes,
  }
}

export const BOOKMARK_SUMMARY_SYSTEM_PROMPT = `You generate a short Chinese summary for a user's recent bookmarks.

Rules:
- Use only the provided bookmark records.
- Do not invent facts, projects, deadlines, or context.
- Keep the tone concise and practical.
- Return sourceAssetIds that refer only to provided bookmark ids.
- If there are no bookmarks, say there is nothing to summarize.
- Use only saved text and URL. Do not claim to have read the linked pages.`

export function buildBookmarkSummaryPromptInput(bookmarks: { id: string; title: string; url: string | null; originalText: string }[]): object {
  return {
    currentTime: new Date().toISOString(),
    bookmarks,
  }
}

export const TODO_REVIEW_SYSTEM_PROMPT = `You review a user's unfinished todos and provide a concise Chinese summary.

Rules:
- Use only the provided todo records.
- Do not invent facts, projects, deadlines, or context.
- Keep the tone concise and practical.
- Return sourceAssetIds that refer only to provided todo ids.
- If there are no unfinished todos, say there is nothing to review.
- Focus on actionable insights and priorities.`

export function buildTodoReviewPromptInput(todos: { id: string; title: string; originalText: string; timeText: string | null; dueAt: Date | null }[]): object {
  return {
    currentTime: new Date().toISOString(),
    todos,
  }
}
