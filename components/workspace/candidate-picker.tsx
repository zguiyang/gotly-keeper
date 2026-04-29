'use client'

import { Card, CardContent } from '@/components/ui/card'

import {
  workspaceInteractionBodyTextClassName,
  workspacePillClassName,
  workspaceSurfaceClassName,
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

export function CandidatePicker({ interaction, selectedId, onSelect }: CandidatePickerProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <p className={workspaceInteractionBodyTextClassName}>{interaction.message}</p>
        <span className={workspacePillClassName}>
          目标: {getTargetLabel(interaction.target)}
        </span>
      </div>

      <div className="space-y-2.5">
        {interaction.candidates.map((candidate) => (
          <button
            key={candidate.id}
            type="button"
            onClick={() => onSelect(candidate.id)}
            aria-pressed={selectedId === candidate.id}
            className={`block w-full rounded-[14px] text-left outline-none transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-px focus-visible:ring-4 focus-visible:ring-primary/12 ${
              selectedId === candidate.id ? 'translate-y-[-1px]' : ''
            }`}
          >
            <Card
              className={`${workspaceSurfaceClassName} transition-[border-color,background-color,box-shadow] duration-200 ${
                selectedId === candidate.id
                  ? 'border-primary/35 bg-primary/[0.045] shadow-[var(--shadow-elevation-1)]'
                  : 'hover:border-primary/18 hover:bg-surface-container-lowest'
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-on-surface">
                      {candidate.label}
                    </p>
                    {candidate.reason ? (
                      <p className="mt-1 text-xs leading-5 text-on-surface-variant/72">
                        {candidate.reason}
                      </p>
                    ) : null}
                  </div>
                  <div
                    className={`mt-0.5 flex size-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                      selectedId === candidate.id
                        ? 'border-primary bg-primary'
                        : 'border-border/70 bg-surface-container-lowest'
                    }`}
                  >
                    {selectedId === candidate.id ? (
                      <svg
                        className="size-full text-primary-foreground"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>
    </div>
  )
}
