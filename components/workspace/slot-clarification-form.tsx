'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { workspaceSurfaceClassName } from './workspace-view-primitives'

import type { ClarifySlotsInteraction, WorkspaceInteractionResponse } from '@/shared/workspace/workspace-run-protocol'

type SlotClarificationFormProps = {
  interaction: ClarifySlotsInteraction
  onSubmit: (response: WorkspaceInteractionResponse) => void
}

export function SlotClarificationForm({ interaction, onSubmit }: SlotClarificationFormProps) {
  const [values, setValues] = useState<Record<string, string>>({})

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      type: 'clarify_slots',
      action: 'submit',
      values,
    })
  }

  const handleCancel = () => {
    onSubmit({
      type: 'clarify_slots',
      action: 'cancel',
    })
  }

  const handleChange = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm text-on-surface-variant">{interaction.message}</p>
      </div>

      <form onSubmit={handleSubmit} className={`${workspaceSurfaceClassName} p-4 space-y-4`}>
        {interaction.fields.map((field) => (
          <div key={field.key} className="space-y-2">
            <Label htmlFor={field.key}>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              id={field.key}
              placeholder={field.placeholder}
              value={values[field.key] || ''}
              onChange={(e) => handleChange(field.key, e.target.value)}
              required={field.required}
            />
          </div>
        ))}

        <div className="flex items-center gap-2 pt-2">
          <Button type="submit" variant="default" size="sm">
            提交
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={handleCancel}>
            取消
          </Button>
        </div>
      </form>
    </div>
  )
}
