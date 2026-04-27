'use client'

import { CheckCircle2, XCircle } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

import { workspaceSurfaceClassName } from './workspace-view-primitives'

import type { WorkspaceRunResult } from '@/shared/workspace/workspace-run-protocol'

type WorkspaceRunResultPanelProps = {
  result: WorkspaceRunResult | null
  assistantText: string | null
}

export function WorkspaceRunResultPanel({ result, assistantText }: WorkspaceRunResultPanelProps) {
  if (!result) {
    return (
      <Card className={workspaceSurfaceClassName}>
        <CardContent className="p-4">
          <p className="text-sm text-on-surface-variant text-center py-4">
            暂无结果
          </p>
        </CardContent>
      </Card>
    )
  }

  if (result.data && typeof result.data === 'object' && 'ok' in result.data && !result.data.ok) {
    return (
      <Card className="border-destructive/20 bg-destructive/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <XCircle className="size-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <Badge variant="destructive" className="text-xs">
                  处理失败
                </Badge>
              </div>
              <p className="text-sm font-medium text-destructive">
                {result.summary}
              </p>
              {assistantText && (
                <p className="text-sm text-on-surface-variant/80">
                  {assistantText}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (result.preview) {
    return (
      <Card className={workspaceSurfaceClassName}>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="default" className="text-xs">
              处理完成
            </Badge>
            {assistantText && (
              <span className="text-xs text-on-surface-variant">{assistantText}</span>
            )}
          </div>

          {result.preview.understanding && (
            <div className="space-y-2">
              <span className="text-xs text-on-surface-variant/60">理解结果</span>
              <p className="text-sm text-on-surface">{result.preview.understanding.rawInput}</p>
            </div>
          )}

          {result.preview.plan && (
            <div className="space-y-2">
              <span className="text-xs text-on-surface-variant/60">执行计划</span>
              <p className="text-sm text-on-surface">{result.preview.plan.summary}</p>
            </div>
          )}

          {result.data !== null && result.data !== undefined && (
            <div className="space-y-2">
              <span className="text-xs text-on-surface-variant/60">返回数据</span>
              <pre className="text-xs bg-muted/40 p-2 rounded-lg overflow-auto">
                {JSON.stringify(result.data, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={workspaceSurfaceClassName}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="size-5 text-emerald-500 flex-shrink-0 mt-0.5" />
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="default" className="text-xs">
                {result.summary}
              </Badge>
              {assistantText && (
                <span className="text-xs text-on-surface-variant">{assistantText}</span>
              )}
            </div>
            {result.data !== null && result.data !== undefined && (
              <pre className="text-xs bg-muted/40 p-2 rounded-lg overflow-auto mt-2">
                {JSON.stringify(result.data, null, 2)}
              </pre>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
