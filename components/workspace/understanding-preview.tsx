'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { workspaceSurfaceClassName } from './workspace-view-primitives'

import type { WorkspaceUnderstandingPreview } from '@/shared/workspace/workspace-run-protocol'

type UnderstandingPreviewProps = {
  understandingPreview: WorkspaceUnderstandingPreview
}

export function UnderstandingPreview({ understandingPreview }: UnderstandingPreviewProps) {
  const getIntentLabel = (intent: string) => {
    if (intent === 'create') return 'Create'
    if (intent === 'update') return 'Update'
    if (intent === 'query') return 'Query'
    if (intent === 'summarize') return 'Summarize'
    return intent
  }

  const getTargetLabel = (target: string) => {
    if (target === 'todos') return 'Tasks'
    if (target === 'notes') return 'Notes'
    if (target === 'bookmarks') return 'Bookmarks'
    if (target === 'mixed') return 'Mixed'
    return target
  }

  return (
    <Card className={workspaceSurfaceClassName}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Understanding Preview</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <span className="text-xs text-on-surface-variant/60">Raw Input</span>
          <p className="text-sm text-on-surface">{understandingPreview.rawInput}</p>
        </div>

        {understandingPreview.normalizedInput !== understandingPreview.rawInput && (
          <div className="space-y-2">
            <span className="text-xs text-on-surface-variant/60">Normalized</span>
            <p className="text-sm text-on-surface">{understandingPreview.normalizedInput}</p>
          </div>
        )}

        {understandingPreview.corrections.length > 0 && (
          <div className="space-y-2">
            <span className="text-xs text-on-surface-variant/60">Correction</span>
            <div className="flex flex-wrap gap-1">
              {understandingPreview.corrections.map((correction, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {correction}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <span className="text-xs text-on-surface-variant/60">
            Identified Tasks ({understandingPreview.draftTasks.length})
          </span>
          <div className="space-y-3">
            {understandingPreview.draftTasks.map((task) => (
              <div
                key={task.id}
                className="p-3 rounded-lg bg-muted/40 space-y-2"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs">
                    {getIntentLabel(task.intent)}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {getTargetLabel(task.target)}
                  </Badge>
                  <span className="text-xs text-on-surface-variant/60">
                    Confidence: {Math.round(task.confidence * 100)}%
                  </span>
                </div>
                <p className="text-sm font-medium text-on-surface">{task.title}</p>

                {task.ambiguities.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-xs text-amber-600 dark:text-amber-400">
                      Ambiguities
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {task.ambiguities.map((ambiguity, index) => (
                        <Badge key={index} variant="outline" className="text-xs text-amber-600 dark:text-amber-400">
                          {ambiguity}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {Object.keys(task.slots).length > 0 && (
                  <div className="space-y-1">
                    <span className="text-xs text-on-surface-variant/60">Additional Info</span>
                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                      {Object.entries(task.slots).map(([key, value]) => (
                        <span key={key} className="text-xs text-on-surface-variant">
                          {key}: {value}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
