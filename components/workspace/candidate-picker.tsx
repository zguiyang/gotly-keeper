'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

import { workspacePillClassName, workspaceSurfaceClassName } from './workspace-view-primitives'

import type { SelectCandidateInteraction, WorkspaceInteractionResponse } from '@/shared/workspace/workspace-run-protocol'

type CandidatePickerProps = {
  interaction: SelectCandidateInteraction
  onSubmit: (response: WorkspaceInteractionResponse) => void
}

export function CandidatePicker({ interaction, onSubmit }: CandidatePickerProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const handleSelect = () => {
    if (selectedId) {
      onSubmit({
        type: 'select_candidate',
        action: 'select',
        candidateId: selectedId,
      })
    }
  }

  const handleSkip = () => {
    onSubmit({
      type: 'select_candidate',
      action: 'skip',
    })
  }

  const handleCancel = () => {
    onSubmit({
      type: 'select_candidate',
      action: 'cancel',
    })
  }

  const getTargetLabel = (target: SelectCandidateInteraction['target']) => {
    if (target === 'todo') return '待办'
    if (target === 'note') return '笔记'
    return '书签'
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm text-on-surface-variant">{interaction.message}</p>
        <span className={workspacePillClassName}>
          目标: {getTargetLabel(interaction.target)}
        </span>
      </div>

      <div className="space-y-3">
        {interaction.candidates.map((candidate) => (
          <Card
            key={candidate.id}
            className={`${workspaceSurfaceClassName} cursor-pointer transition-all ${
              selectedId === candidate.id
                ? 'border-primary/40 bg-primary/5'
                : 'hover:border-primary/20'
            }`}
            onClick={() => setSelectedId(candidate.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-on-surface truncate">
                    {candidate.label}
                  </p>
                  {candidate.reason && (
                    <p className="mt-1 text-xs text-on-surface-variant/70">
                      {candidate.reason}
                    </p>
                  )}
                </div>
                <div
                  className={`size-5 rounded-full border-2 flex-shrink-0 transition-colors ${
                    selectedId === candidate.id
                      ? 'border-primary bg-primary'
                      : 'border-border'
                  }`}
                >
                  {selectedId === candidate.id && (
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
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center gap-2 pt-2">
        <Button
          variant="default"
          size="sm"
          onClick={handleSelect}
          disabled={!selectedId}
        >
          选择
        </Button>
        <Button variant="outline" size="sm" onClick={handleSkip}>
          跳过
        </Button>
        <Button variant="ghost" size="sm" onClick={handleCancel}>
          取消
        </Button>
      </div>
    </div>
  )
}
