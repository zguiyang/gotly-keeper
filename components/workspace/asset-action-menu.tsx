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

      <div className="absolute right-0 z-20 mt-2 min-w-[152px] rounded-2xl border border-outline-variant/15 bg-surface-container-lowest p-1.5 shadow-[0_20px_45px_-28px_rgba(0,81,177,0.35)]">
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
            className={`w-full rounded-xl px-3 py-2 text-left text-[12px] transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
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
