'use client'

import { useId, useState } from 'react'

import {
  Field,
  FieldContent,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'

import {
  workspaceInteractionBodyTextClassName,
  workspaceInteractionCardClassName,
  workspaceInteractionInsetFieldClassName,
  workspaceInteractionLabelClassName,
} from './workspace-view-primitives'

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
    <div className="space-y-3">
      <div className="space-y-1.5">
        <p className={workspaceInteractionBodyTextClassName}>{interaction.message}</p>
      </div>

      <form
        id={formId}
        className={`${workspaceInteractionCardClassName} p-5`}
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit({
            type: 'clarify_slots',
            action: 'submit',
            values,
          })
        }}
      >
        <FieldGroup className="gap-3.5">
          {interaction.fields.map((field) => {
            const inputId = `${idPrefix}-${field.key}`

            return (
              <Field key={field.key}>
                <FieldLabel htmlFor={inputId} className={workspaceInteractionLabelClassName}>
                  {field.label}
                  {field.required ? <span className="ml-1 text-destructive">*</span> : null}
                </FieldLabel>
                <FieldContent>
                  <Input
                    id={inputId}
                    placeholder={field.placeholder}
                    value={values[field.key] || ''}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    required={field.required}
                    name={field.key}
                    className={workspaceInteractionInsetFieldClassName}
                  />
                </FieldContent>
              </Field>
            )
          })}
        </FieldGroup>
      </form>
    </div>
  )
}
