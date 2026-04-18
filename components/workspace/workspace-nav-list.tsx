'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { workspaceNavItems, isWorkspaceNavItemActive } from '@/config/workspace/nav'

type WorkspaceNavListVariant = 'sidebar' | 'sheet'

type WorkspaceNavListProps = {
  variant: WorkspaceNavListVariant
}

export function WorkspaceNavList({ variant }: WorkspaceNavListProps) {
  const pathname = usePathname()
  const baseItemClassName =
    'flex items-center gap-3 rounded-2xl px-3.5 py-2.5 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30'

  return (
    <>
      {workspaceNavItems.map((item) => {
        const Icon = item.icon
        const active = isWorkspaceNavItemActive(pathname, item.href)

        return (
          <Link
            key={item.label}
            href={item.href}
            className={`${baseItemClassName} ${
              variant === 'sidebar' ? 'group relative' : ''
            } ${
              active
                ? 'bg-primary/6 font-medium text-primary'
                : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
            }`}
          >
            {variant === 'sidebar' && active ? (
              <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-primary" />
            ) : null}
            <Icon className="h-4 w-4" />
            <span className="text-[15px] leading-6">{item.label}</span>
          </Link>
        )
      })}
    </>
  )
}
