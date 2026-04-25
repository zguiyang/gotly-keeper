import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'

import type { LucideIcon } from 'lucide-react'

const workspaceMetaTextClassName = 'text-[11px] font-medium tracking-normal text-on-surface-variant/80'

const workspacePillClassName =
  'inline-flex items-center rounded-full border border-border/25 bg-muted/70 px-2.5 py-1 text-[11px] font-medium tracking-[0.02em] text-on-surface-variant'

const workspaceSurfaceClassName =
  'rounded-[14px] border border-border/20 bg-surface-container-lowest shadow-[var(--shadow-elevation-1)]'

const workspacePanelSurfaceClassName =
  'rounded-[1.5rem] border border-border/20 bg-surface-container-lowest/90 shadow-[var(--shadow-elevation-1)]'

const workspaceListSurfaceClassName =
  'rounded-[14px] border border-border/18 bg-surface-container-lowest/78 transition-colors duration-150 hover:border-border/28 hover:bg-surface-container-lowest'

const workspaceContentCardSurfaceClassName =
  'rounded-[14px] border border-border/20 bg-surface-container-lowest shadow-[var(--shadow-elevation-1)]'

const workspaceCriticalSurfaceClassName =
  'rounded-[14px] border border-destructive/24 bg-destructive/[0.045] shadow-[var(--shadow-elevation-1)]'

type WorkspacePageHeaderProps = {
  title: string
  description?: string
  eyebrow?: string
  className?: string
}

function WorkspacePageHeader({ title, description, eyebrow, className }: WorkspacePageHeaderProps) {
  return (
    <div className={cn('mb-8 flex flex-col gap-3 sm:mb-10', className)}>
      {eyebrow ? (
        <span className="text-[12px] font-semibold tracking-normal text-on-surface-variant/80">
          {eyebrow}
        </span>
      ) : null}
      <h1 className="font-headline text-[2rem] font-semibold tracking-normal text-on-surface sm:text-[2.25rem] lg:text-[2.625rem]">
        {title}
      </h1>
      {description ? (
        <p className="max-w-2xl text-[15px] leading-7 text-on-surface-variant sm:text-base">
          {description}
        </p>
      ) : null}
    </div>
  )
}

type WorkspaceFilterTabsProps<TValue extends string> = {
  tabs: ReadonlyArray<{ key: TValue; label: string }>
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
    <ToggleGroup
      value={[value]}
      onValueChange={(nextValue) => {
        const next = nextValue.at(-1)
        if (next) {
          onValueChange(next as TValue)
        }
      }}
      variant="outline"
      size="sm"
      spacing={2}
      className={cn(
        'flex flex-wrap items-center gap-2 border-b border-border/18 pb-4 sm:gap-2.5',
        className
      )}
      aria-label="内容筛选"
    >
      {tabs.map((tab) => (
        <ToggleGroupItem
          key={tab.key}
          value={tab.key}
          className="h-8 rounded-full px-3.5 text-[12px] tracking-normal data-[pressed]:border-primary/30 data-[pressed]:bg-primary/12 data-[pressed]:text-primary"
        >
          {tab.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

function WorkspaceSectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-4 pb-4 pt-8">
      <span className="text-[12px] font-semibold tracking-[0.12em] text-on-surface-variant/80 uppercase">
        {label}
      </span>
      <Separator className="bg-border/18" />
    </div>
  )
}

type WorkspaceEmptyStateProps = {
  title: string
  description?: string
  icon?: LucideIcon
  action?: React.ReactNode
  className?: string
}

function WorkspaceEmptyState({ title, description, icon: Icon, action, className }: WorkspaceEmptyStateProps) {
  return (
    <Card
      className={cn(
        'mt-10 rounded-[1.25rem] border border-border/12 bg-surface-container-lowest/75 py-8 shadow-[var(--shadow-elevation-1)] sm:mt-12 sm:py-10',
        className
      )}
    >
      <CardContent className="flex flex-col items-center gap-5 px-6 text-center">
        {Icon ? (
          <div className="flex size-10 items-center justify-center rounded-xl bg-muted text-on-surface-variant">
            <Icon className="size-6" />
          </div>
        ) : null}
        <div className="flex max-w-md flex-col gap-2">
          <p className="text-base font-semibold text-on-surface">{title}</p>
          {description ? <p className="text-sm leading-6 text-on-surface-variant/75">{description}</p> : null}
        </div>
        {action ? <div className="pt-1">{action}</div> : null}
      </CardContent>
    </Card>
  )
}

function WorkspaceTypeBadge({ label, variant }: { label: string; variant: 'default' | 'secondary' | 'outline' }) {
  return (
    <Badge variant={variant} className="rounded-full px-2.5 py-1 text-[10px] font-medium tracking-normal">
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
  workspaceContentCardSurfaceClassName,
  workspaceCriticalSurfaceClassName,
  workspaceListSurfaceClassName,
  workspacePanelSurfaceClassName,
  workspaceSurfaceClassName,
  WorkspaceTypeBadge,
}
