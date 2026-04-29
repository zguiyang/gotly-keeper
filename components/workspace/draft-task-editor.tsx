'use client'

import { forwardRef, useImperativeHandle, useState } from 'react'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { workspaceRunSectionClassName } from './workspace-view-primitives'

import type { DraftWorkspaceTask, EditDraftTasksInteraction } from '@/shared/workspace/workspace-run-protocol'

type DraftTaskEditorProps = {
  interaction: EditDraftTasksInteraction
}

export type DraftTaskEditorHandle = {
  getTasks: () => DraftWorkspaceTask[]
}

export const DraftTaskEditor = forwardRef<DraftTaskEditorHandle, DraftTaskEditorProps>(
  function DraftTaskEditor({ interaction }, ref) {
    const [tasks, setTasks] = useState<DraftWorkspaceTask[]>(interaction.tasks)

    useImperativeHandle(ref, () => ({
      getTasks: () => tasks,
    }))

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
      <section className={workspaceRunSectionClassName}>
        <h3 className="text-xs font-semibold text-on-surface-variant">任务</h3>
        <ol className="space-y-3">
          {tasks.map((task, index) => (
            <li key={task.id} className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-on-surface-variant/60">
                  {getIntentLabel(task.intent)} · {getTargetLabel(task.target)}
                </span>
                <span className="text-xs text-on-surface-variant/40">
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
            </li>
          ))}
        </ol>
      </section>
    )
  }
)
