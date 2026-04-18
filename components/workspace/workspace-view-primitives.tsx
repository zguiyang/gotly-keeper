'use client'

import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

import type { LucideIcon } from 'lucide-react'

type WorkspacePageHeaderProps = {
  title: string
  description?: string
  eyebrow?: string
  className?: string
}

function WorkspacePageHeader({ title, description, eyebrow, className }: WorkspacePageHeaderProps) {
  return (
    <div className={cn('mb-8 flex flex-col gap-2', className)}>
      {eyebrow ? (
        <span className="text-xs font-semibold tracking-[0.18em] text-primary/70 uppercase">
          {eyebrow}
        </span>
      ) : null}
      <h1 className="font-headline text-2xl font-bold tracking-tight text-on-surface lg:text-3xl">
        {title}
      </h1>
      {description ? <p className="max-w-2xl text-sm leading-relaxed text-on-surface-variant">{description}</p> : null}
    </div>
  )
}

type WorkspaceFilterTabsProps<TValue extends string> = {
  tabs: Array<{ key: TValue; label: string }>
  value: TValue
  onValueChange: (value: TValue) => void
  className?: string
}

function WorkspaceFilterTabs<TValue extends string>({
  tabs,
  value,
  onValueChange,
  className,
}: WorkspaceFilterTabsProps<TValue>) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2 border-b border-outline-variant/10 pb-3', className)} aria-label="内容筛选">
      {tabs.map((tab) => {
        const isActive = tab.key === value

        return (
          <button
            key={tab.key}
            type="button"
            aria-pressed={isActive}
            onClick={() => onValueChange(tab.key)}
            className={cn(
              'rounded-sm border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
              isActive
                ? 'border-primary/20 bg-surface-container-lowest text-primary'
                : 'border-outline-variant/20 bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
            )}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}

function WorkspaceSectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-4 py-6">
      <span className="text-xs font-bold tracking-widest text-on-surface-variant/60 uppercase">
        {label}
      </span>
      <Separator className="bg-outline-variant/10" />
    </div>
  )
}

type WorkspaceEmptyStateProps = {
  title: string
  description?: string
  icon?: LucideIcon
  className?: string
}

function WorkspaceEmptyState({ title, description, icon: Icon, className }: WorkspaceEmptyStateProps) {
  return (
    <Card className={cn('mt-14 rounded-lg border-2 border-dashed border-outline-variant/10 bg-transparent py-8 shadow-none', className)}>
      <CardContent className="flex flex-col items-center gap-3 px-6 text-center">
        {Icon ? (
          <div className="flex size-12 items-center justify-center rounded-full bg-surface-container-low text-on-surface-variant/50">
            <Icon className="size-6" />
          </div>
        ) : null}
        <div className="flex max-w-sm flex-col gap-1">
          <p className="text-sm font-medium text-on-surface-variant">{title}</p>
          {description ? <p className="text-xs leading-relaxed text-on-surface-variant/70">{description}</p> : null}
        </div>
      </CardContent>
    </Card>
  )
}

function WorkspaceTypeBadge({ label, variant }: { label: string; variant: 'default' | 'secondary' | 'outline' }) {
  return (
    <Badge variant={variant} className="rounded-sm px-2 py-0.5 text-[10px] font-medium">
      {label}
    </Badge>
  )
}

type WorkspaceStatCardProps = {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}

function WorkspaceStatCard({ title, description, children, className }: WorkspaceStatCardProps) {
  return (
    <Card className={cn('rounded-lg border-outline-variant/10 bg-surface-container-lowest', className)}>
      <CardHeader className="gap-1 px-4">
        <CardTitle className="text-sm">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="px-4">{children}</CardContent>
    </Card>
  )
}

export {
  WorkspaceEmptyState,
  WorkspaceFilterTabs,
  WorkspacePageHeader,
  WorkspaceSectionDivider,
  WorkspaceStatCard,
  WorkspaceTypeBadge,
}
