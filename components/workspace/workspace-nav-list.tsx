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

  return (
    <>
      {workspaceNavItems.map((item) => {
        const Icon = item.icon
        const active = isWorkspaceNavItemActive(pathname, item.href)

        return (
          <Link
            key={item.label}
            href={item.href}
            className={
              variant === 'sidebar'
                ? `group relative flex items-center gap-3 rounded-sm px-3 py-2 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
                    active
                      ? 'text-primary font-medium bg-primary/5'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
                  }`
                : `flex items-center gap-3 rounded-sm px-3 py-2 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
                    active
                      ? 'text-primary font-medium bg-primary/5'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
                  }`
            }
          >
            {variant === 'sidebar' && active ? (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r" />
            ) : null}
            <Icon className="w-4 h-4" />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </>
  )
}
