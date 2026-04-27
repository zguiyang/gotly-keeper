'use client'

import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { workspaceSurfaceClassName } from './workspace-view-primitives'

import type { DraftWorkspaceTask, EditDraftTasksInteraction, WorkspaceInteractionResponse } from '@/shared/workspace/workspace-run-protocol'

type DraftTaskEditorProps = {
  interaction: EditDraftTasksInteraction
  onSubmit: (response: WorkspaceInteractionResponse) => void
}

export function DraftTaskEditor({ interaction, onSubmit }: DraftTaskEditorProps) {
  const [tasks, setTasks] = useState<DraftWorkspaceTask[]>(interaction.tasks)

  const handleSave = () => {
    onSubmit({
      type: 'edit_draft_tasks',
      action: 'save',
      tasks,
    })
  }

  const handleCancel = () => {
    onSubmit({
      type: 'edit_draft_tasks',
      action: 'cancel',
    })
  }

  const updateTask = (index: number, updates: Partial<DraftWorkspaceTask>) => {
    setTasks((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], ...updates }
      return updated
    })
  }

  const getIntentLabel = (intent: string) => {
    if (intent === 'create') return '创建'
    if (intent === 'update') return '更新'
    if (intent === 'query') return '查询'
    if (intent === 'summarize') return '总结'
    return intent
  }

  const getTargetLabel = (target: DraftWorkspaceTask['target']) => {
    if (target === 'todos') return '待办'
    if (target === 'notes') return '笔记'
    if (target === 'bookmarks') return '书签'
    return '混合'
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm text-on-surface-variant">{interaction.message}</p>
      </div>

      <div className="space-y-4">
        {tasks.map((task, index) => (
          <Card key={task.id} className={workspaceSurfaceClassName}>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {getIntentLabel(task.intent)}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {getTargetLabel(task.target)}
                </Badge>
                <span className="text-xs text-on-surface-variant/60">
                  置信度: {Math.round(task.confidence * 100)}%
                </span>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`task-title-${index}`} className="text-xs">
                  标题
                </Label>
                <Input
                  id={`task-title-${index}`}
                  value={task.title}
                  onChange={(e) => updateTask(index, { title: e.target.value })}
                />
              </div>

              {Object.keys(task.slots).length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs">附加信息</Label>
                  <div className="space-y-2">
                    {Object.entries(task.slots).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-2">
                        <span className="text-xs text-on-surface-variant w-20">{key}:</span>
                        <Input
                          value={value}
                          onChange={(e) =>
                            updateTask(index, {
                              slots: { ...task.slots, [key]: e.target.value },
                            })
                          }
                          className="flex-1"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center gap-2 pt-2">
        <Button variant="default" size="sm" onClick={handleSave}>
          保存并继续
        </Button>
        <Button variant="ghost" size="sm" onClick={handleCancel}>
          取消
        </Button>
      </div>
    </div>
  )
}
