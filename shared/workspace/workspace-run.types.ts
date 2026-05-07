import type { WorkspaceTimeConstraint } from './workspace-run-protocol'

// Transitional adapter — maps WorkspaceTimeConstraint into search-layer filters.
// Will be replaced when search services accept WorkspaceTimeConstraint directly.
export type WorkspaceAgentTimeFilter =
  | { kind: 'none' }
  | {
      kind: 'exact_range'
      phrase: string
      startIso: string
      endIso: string
      basis: string
    }
  | {
      kind: 'vague'
      phrase: string
      reason: string
    }

export function timeConstraintToFilter(
  tc: WorkspaceTimeConstraint | null | undefined,
  now: Date
): WorkspaceAgentTimeFilter {
  if (!tc) return { kind: 'none' }

  if (tc.kind === 'recent') {
    const windowMinutes = tc.strength === 'strong' ? 15 : 240
    const start = new Date(now.getTime() - windowMinutes * 60 * 1000)
    return {
      kind: 'exact_range',
      phrase: tc.strength === 'strong' ? '刚刚' : '最近',
      startIso: start.toISOString(),
      endIso: now.toISOString(),
      basis: `time-constraint-recent-${tc.strength}`,
    }
  }

  if (tc.kind === 'relative_window') {
    const start = new Date(now.getTime())
    if (tc.unit === 'minute') start.setMinutes(start.getMinutes() - tc.value)
    else if (tc.unit === 'hour') start.setHours(start.getHours() - tc.value)
    else if (tc.unit === 'day') start.setDate(start.getDate() - tc.value)
    else if (tc.unit === 'week') start.setDate(start.getDate() - tc.value * 7)
    else if (tc.unit === 'month') start.setMonth(start.getMonth() - tc.value)

    return {
      kind: 'exact_range',
      phrase: `${tc.value}${tc.unit}`,
      startIso: start.toISOString(),
      endIso: now.toISOString(),
      basis: 'time-constraint-window',
    }
  }

  if (tc.kind === 'named_range') {
    return {
      kind: 'exact_range',
      phrase: tc.name,
      startIso: startOfNamedRange(tc.name, now).toISOString(),
      endIso: endOfNamedRange(tc.name, now).toISOString(),
      basis: `time-constraint-${tc.name}`,
    }
  }

  if (tc.kind === 'exact_range') {
    const start = tc.startAt ? new Date(tc.startAt) : new Date(0)
    const end = tc.endAt ? new Date(tc.endAt) : new Date('9999-12-31T23:59:59.999Z')
    return {
      kind: 'exact_range',
      phrase: 'custom',
      startIso: start.toISOString(),
      endIso: end.toISOString(),
      basis: 'time-constraint-exact',
    }
  }

  return { kind: 'none' }
}

function startOfNamedRange(name: string, now: Date): Date {
  const d = new Date(now)
  if (name === 'today') {
    d.setHours(0, 0, 0, 0)
    return d
  }
  if (name === 'yesterday') {
    d.setDate(d.getDate() - 1)
    d.setHours(0, 0, 0, 0)
    return d
  }
  if (name === 'this_week') {
    const day = d.getDay()
    const diff = day === 0 ? 6 : day - 1
    d.setDate(d.getDate() - diff)
    d.setHours(0, 0, 0, 0)
    return d
  }
  if (name === 'this_month') {
    d.setDate(1)
    d.setHours(0, 0, 0, 0)
    return d
  }
  return d
}

function endOfNamedRange(name: string, now: Date): Date {
  const d = new Date(now)
  if (name === 'today') {
    d.setHours(23, 59, 59, 999)
    return d
  }
  if (name === 'yesterday') {
    d.setDate(d.getDate() - 1)
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() + 1)
    d.setMilliseconds(-1)
    return d
  }
  if (name === 'this_week') {
    const day = d.getDay()
    const diff = day === 0 ? 0 : 7 - day
    d.setDate(d.getDate() + diff)
    d.setHours(23, 59, 59, 999)
    return d
  }
  if (name === 'this_month') {
    d.setMonth(d.getMonth() + 1)
    d.setDate(0)
    d.setHours(23, 59, 59, 999)
    return d
  }
  d.setHours(23, 59, 59, 999)
  return d
}
