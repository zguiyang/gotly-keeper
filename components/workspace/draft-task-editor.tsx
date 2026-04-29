'use client'

import { forwardRef, useImperativeHandle, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'

import {
  workspaceInteractionBodyTextClassName,
  workspaceInteractionCardClassName,
  workspaceInteractionInsetFieldClassName,
  workspaceInteractionLabelClassName,
} from './workspace-view-primitives'

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
      <Card className={workspaceInteractionCardClassName}>
        <CardHeader className="gap-2 px-5 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="rounded-full px-2.5 py-1 text-[11px] font-medium tracking-normal">
              多任务校对
            </Badge>
            <Badge variant="outline" className="rounded-full px-2.5 py-1 text-[11px] font-medium tracking-normal">
              {tasks.length} 条任务
            </Badge>
          </div>
          <div className="flex flex-col gap-1">
            <CardTitle className="text-base text-on-surface">确认任务内容后继续</CardTitle>
            <p className={workspaceInteractionBodyTextClassName}>
              优先修改标题；附加信息会作为执行时的上下文一起保存。
            </p>
          </div>
        </CardHeader>

        <Separator className="bg-border/10" />

        <CardContent className="px-5 py-4">
          <ol className="flex flex-col gap-3">
          {tasks.map((task, index) => (
            <li
              key={task.id}
              className="rounded-[1rem] border border-border/10 bg-muted/25 p-4 transition-[transform,border-color,background-color,box-shadow] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-px hover:border-border/20 hover:bg-muted/35 hover:shadow-[var(--shadow-elevation-1)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-[10px] tracking-normal">
                    任务 {index + 1}
                  </Badge>
                  <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-[10px] tracking-normal">
                    {getIntentLabel(task.intent)}
                  </Badge>
                  <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-[10px] tracking-normal">
                    {getTargetLabel(task.target)}
                  </Badge>
                </div>
                <span className="text-xs font-medium tabular-nums text-on-surface-variant/60">
                  置信度 {Math.round(task.confidence * 100)}%
                </span>
              </div>

              <FieldGroup className="mt-3.5 gap-3.5">
                <Field>
                  <FieldLabel
                    htmlFor={`task-title-${index}`}
                    className={workspaceInteractionLabelClassName}
                  >
                    标题
                  </FieldLabel>
                  <FieldContent>
                    <Input
                      id={`task-title-${index}`}
                      value={task.title}
                      onChange={(e) => updateTask(index, { title: e.target.value })}
                      name={`task-title-${index}`}
                      className={workspaceInteractionInsetFieldClassName}
                    />
                    <FieldDescription>这条标题会直接影响后续保存与执行内容。</FieldDescription>
                  </FieldContent>
                </Field>

                {Object.keys(task.slots).length > 0 ? (
                  <>
                    <FieldSeparator />
                    <FieldGroup className="gap-3">
                      <p className="text-[12px] font-medium text-on-surface-variant/68">附加信息</p>
                      {Object.entries(task.slots).map(([key, value]) => {
                        const inputId = `task-slot-${index}-${key}`

                        return (
                          <Field key={key}>
                            <FieldLabel
                              htmlFor={inputId}
                              className={workspaceInteractionLabelClassName}
                            >
                              {key}
                            </FieldLabel>
                            <FieldContent>
                              <Input
                                id={inputId}
                                value={value}
                                onChange={(e) =>
                                  updateTask(index, {
                                    slots: { ...task.slots, [key]: e.target.value },
                                  })
                                }
                                name={inputId}
                                className={workspaceInteractionInsetFieldClassName}
                              />
                            </FieldContent>
                          </Field>
                        )
                      })}
                    </FieldGroup>
                  </>
                ) : null}
              </FieldGroup>
            </li>
          ))}
          </ol>
        </CardContent>
      </Card>
    )
  }
)
