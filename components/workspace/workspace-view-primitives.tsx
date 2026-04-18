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

const workspaceMetaTextClassName = 'text-[11px] font-medium tracking-[0.02em] text-on-surface-variant/60'

const workspacePillClassName =
  'inline-flex items-center rounded-full border border-outline-variant/15 bg-surface-container-low px-2.5 py-1 text-[11px] font-medium tracking-[0.02em] text-on-surface-variant'

const workspaceSurfaceClassName =
  'rounded-2xl border border-outline-variant/10 bg-surface-container-lowest shadow-[0_12px_32px_-20px_rgba(0,81,177,0.22)]'

type WorkspacePageHeaderProps = {
  title: string
  description?: string
  eyebrow?: string
  className?: string
}

function WorkspacePageHeader({ title, description, eyebrow, className }: WorkspacePageHeaderProps) {
  return (
    <div className={cn('mb-10 flex flex-col gap-3', className)}>
      {eyebrow ? (
        <span className="text-[11px] font-semibold tracking-[0.22em] text-primary/70 uppercase">
          {eyebrow}
        </span>
      ) : null}
      <h1 className="font-headline text-[2rem] font-semibold tracking-[-0.03em] text-on-surface lg:text-[2.5rem]">
        {title}
      </h1>
      {description ? (
        <p className="max-w-3xl text-[15px] leading-7 text-on-surface-variant">
          {description}
        </p>
      ) : null}
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
    <div
      className={cn('flex flex-wrap items-center gap-2 border-b border-outline-variant/10 pb-4', className)}
      aria-label="内容筛选"
    >
      {tabs.map((tab) => {
        const isActive = tab.key === value

        return (
          <button
            key={tab.key}
            type="button"
            aria-pressed={isActive}
            onClick={() => onValueChange(tab.key)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-[11px] font-medium tracking-[0.02em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
              isActive
                ? 'border-primary/15 bg-primary/6 text-primary'
                : 'border-outline-variant/15 bg-surface-container-low text-on-surface-variant hover:border-outline-variant/25 hover:bg-surface-container-high/80'
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
    <div className="flex items-center gap-4 py-7">
      <span className="text-[11px] font-semibold tracking-[0.18em] text-on-surface-variant/60 uppercase">
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
    <Card
      className={cn(
        'mt-14 rounded-2xl border border-dashed border-outline-variant/20 bg-surface-container-low/30 py-10 shadow-none',
        className
      )}
    >
      <CardContent className="flex flex-col items-center gap-4 px-6 text-center">
        {Icon ? (
          <div className="flex size-12 items-center justify-center rounded-full bg-surface-container-lowest text-on-surface-variant/50 shadow-[0_10px_30px_-24px_rgba(0,81,177,0.35)]">
            <Icon className="size-6" />
          </div>
        ) : null}
        <div className="flex max-w-sm flex-col gap-1">
          <p className="text-base font-medium text-on-surface">{title}</p>
          {description ? <p className="text-sm leading-6 text-on-surface-variant/75">{description}</p> : null}
        </div>
      </CardContent>
    </Card>
  )
}

function WorkspaceTypeBadge({ label, variant }: { label: string; variant: 'default' | 'secondary' | 'outline' }) {
  return (
    <Badge variant={variant} className="rounded-full px-2.5 py-1 text-[10px] font-medium tracking-[0.04em]">
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
    <Card className={cn(workspaceSurfaceClassName, className)}>
      <CardHeader className="gap-1 px-5 py-5">
        <CardTitle className="text-sm">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="px-5 pb-5">{children}</CardContent>
    </Card>
  )
}

export {
  WorkspaceEmptyState,
  WorkspaceFilterTabs,
  workspaceMetaTextClassName,
  WorkspacePageHeader,
  workspacePillClassName,
  WorkspaceSectionDivider,
  WorkspaceStatCard,
  workspaceSurfaceClassName,
  WorkspaceTypeBadge,
}
