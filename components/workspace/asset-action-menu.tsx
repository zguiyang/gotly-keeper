'use client'

import { MoreVertical } from 'lucide-react'

type MenuAction = {
  label: string
  onClick: () => void
  disabled?: boolean
  danger?: boolean
}

export function AssetActionMenu({
  actions,
  ariaLabel = '更多操作',
}: {
  actions: MenuAction[]
  ariaLabel?: string
}) {
  return (
    <details className="relative group/menu">
        <summary
        className="list-none rounded-sm p-1 text-on-surface-variant transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        aria-label={ariaLabel}
      >
        <MoreVertical className="w-4 h-4" />
      </summary>

      <div className="absolute right-0 z-20 mt-2 min-w-[140px] rounded-md border border-outline-variant/20 bg-surface-container-lowest shadow-lg p-1">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={() => {
              action.onClick()
              const details = document.activeElement?.closest('details')
              if (details) {
                details.removeAttribute('open')
              }
            }}
            disabled={action.disabled}
            className={`w-full text-left px-3 py-2 text-xs rounded-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              action.danger
                ? 'text-error hover:bg-error/10'
                : 'text-on-surface hover:bg-surface-container-high'
            }`}
          >
            {action.label}
          </button>
        ))}
      </div>
    </details>
  )
}
