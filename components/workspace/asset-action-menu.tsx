'use client'

import { MoreVertical } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

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
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={ariaLabel}
        render={<Button variant="ghost" size="icon" className="text-on-surface-variant hover:text-primary" />}
      >
        <MoreVertical />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[152px]">
        <DropdownMenuGroup>
          {actions.map((action) => (
            <DropdownMenuItem
              key={action.label}
              disabled={action.disabled}
              variant={action.danger ? 'destructive' : 'default'}
              onClick={action.onClick}
              className="text-[12px]"
            >
              {action.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
