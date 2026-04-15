import 'server-only'

import { summarizeRecentNotes } from '@/server/services/workspace/notes.summary.service'
import type { SummarizeRecentNotesInput, NoteSummaryResult } from './workspace.types'

export async function summarizeRecentNotesUseCase(
  input: SummarizeRecentNotesInput
): Promise<NoteSummaryResult> {
  return summarizeRecentNotes(input.userId)
}
