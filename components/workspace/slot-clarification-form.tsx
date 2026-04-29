'use client'

import { useId, useState } from 'react'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { workspaceSurfaceClassName } from './workspace-view-primitives'

import type { ClarifySlotsInteraction, WorkspaceInteractionResponse } from '@/shared/workspace/workspace-run-protocol'

type SlotClarificationFormProps = {
  interaction: ClarifySlotsInteraction
  formId: string
  onSubmit: (response: WorkspaceInteractionResponse) => void
}

export function SlotClarificationForm({ interaction, formId, onSubmit }: SlotClarificationFormProps) {
  const [values, setValues] = useState<Record<string, string>>({})
  const idPrefix = useId()

  const handleChange = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm text-on-surface-variant">{interaction.message}</p>
      </div>

      <form
        id={formId}
        className={`${workspaceSurfaceClassName} p-4 space-y-4`}
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit({
            type: 'clarify_slots',
            action: 'submit',
            values,
          })
        }}
      >
        {interaction.fields.map((field) => {
          const inputId = `${idPrefix}-${field.key}`

          return (
            <div key={field.key} className="space-y-2">
              <Label htmlFor={inputId}>
                {field.label}
                {field.required && <span className="text-destructive ml-1">*</span>}
              </Label>
              <Input
                id={inputId}
                placeholder={field.placeholder}
                value={values[field.key] || ''}
                onChange={(e) => handleChange(field.key, e.target.value)}
                required={field.required}
                name={field.key}
              />
            </div>
          )
        })}
      </form>
    </div>
  )
}
