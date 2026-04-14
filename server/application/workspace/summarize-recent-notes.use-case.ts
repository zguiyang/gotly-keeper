import 'server-only'

import { summarizeRecentNotes } from '@/server/notes/notes.summary.service'
import type { SummarizeRecentNotesInput, NoteSummaryResult } from './workspace.types'

export async function summarizeRecentNotesUseCase(
  input: SummarizeRecentNotesInput
): Promise<NoteSummaryResult> {
  return summarizeRecentNotes(input.userId)
}
