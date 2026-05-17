'use client'

// DESIGN_TOKEN_EXCEPTION: Warm modern accent colors (amber/emerald) are intentionally raw for selection states

import {
  workspaceInteractionBodyTextClassName,
  workspacePillClassName,
} from './workspace-view-primitives'

import type { SelectCandidateInteraction } from '@/shared/workspace/workspace-run-protocol'

type CandidatePickerProps = {
  interaction: SelectCandidateInteraction
  selectedId: string | null
  onSelect: (candidateId: string) => void
}

function getTargetLabel(target: SelectCandidateInteraction['target']) {
  if (target === 'todo') return '待办'
  if (target === 'note') return '笔记'
  return '书签'
}

function getStatusLabel(status: string | undefined) {
  if (status === 'done') return '已完成'
  if (status === 'open') return '未完成'
  return null
}

function formatTime(iso: string | undefined) {
  if (!iso) return null
  try {
    const d = new Date(iso)
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hour = String(d.getHours()).padStart(2, '0')
    const min = String(d.getMinutes()).padStart(2, '0')
    return `${month}-${day} ${hour}:${min}`
  } catch {
    return null
  }
}

export function CandidatePicker({ interaction, selectedId, onSelect }: CandidatePickerProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <p className={workspaceInteractionBodyTextClassName}>{interaction.message}</p>
        <span className={workspacePillClassName}>
          目标: {getTargetLabel(interaction.target)}
        </span>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2">
        {interaction.candidates.map((candidate) => (
          <button
            key={candidate.id}
            type="button"
            onClick={() => onSelect(candidate.id)}
            aria-pressed={selectedId === candidate.id}
            className={`w-full rounded-[1.15rem] text-left outline-none transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 focus-visible:ring-4 focus-visible:ring-amber-500/15 ${
              selectedId === candidate.id ? 'shadow-[var(--shadow-elevation-2)]' : ''
            }`}
          >
            <div
              className={`rounded-[1.15rem] border p-4 transition-[border-color,background-color,box-shadow] duration-200 ${
                selectedId === candidate.id
                  ? 'border-amber-400/40 bg-amber-50/70 shadow-[var(--shadow-elevation-1)] dark:bg-amber-900/10'
                  : 'border-border/12 bg-surface-container-lowest/90 shadow-[var(--shadow-elevation-1)] hover:border-amber-300/25 hover:bg-amber-50/30 dark:hover:bg-amber-900/5'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                    selectedId === candidate.id
                      ? 'border-amber-500 bg-amber-500 text-white'
                      : 'border-border/60 bg-surface-container-lowest'
                  }`}
                >
                  {selectedId === candidate.id ? (
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : null}
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-on-surface">
                      {candidate.label}
                    </p>
                    {candidate.status ? (
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium leading-4 ${
                        candidate.status === 'done'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                          : 'bg-muted/70 text-on-surface-variant'
                      }`}>
                        {getStatusLabel(candidate.status)}
                      </span>
                    ) : null}
                  </div>
                  {candidate.dueAt || candidate.timeText ? (
                    <p className="text-xs leading-5 text-on-surface-variant">
                      {candidate.dueAt ? `计划: ${formatTime(candidate.dueAt)}` : ''}
                      {candidate.dueAt && candidate.timeText ? ' · ' : ''}
                      {candidate.timeText && !candidate.dueAt ? `时间: ${candidate.timeText}` : ''}
                    </p>
                  ) : null}
                  {candidate.preview && candidate.preview !== candidate.label ? (
                    <p className="line-clamp-2 text-xs leading-5 text-on-surface-variant/72">
                      {candidate.preview}
                    </p>
                  ) : null}
                  <div className="flex items-center gap-2 text-[10px] leading-4 text-on-surface-variant/60">
                    {candidate.updatedAt ? (
                      <span>更新: {formatTime(candidate.updatedAt)}</span>
                    ) : null}
                    {candidate.reason ? (
                      <span>{candidate.reason}</span>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
