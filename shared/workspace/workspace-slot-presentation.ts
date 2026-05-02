import { formatAbsoluteDateTime } from '@/shared/time/formatters'

const SLOT_LABELS: Record<string, string> = {
  dueAt: '截止日期',
  timeText: '时间说明',
  url: '链接',
  details: '补充说明',
  content: '备注',
}

const SLOT_ORDER = ['dueAt', 'timeText', 'url', 'details', 'content'] as const

export type WorkspaceDraftSlotField = {
  key: string
  label: string
  value: string
  type: 'datetime' | 'url' | 'text'
}

function compareSlotKeys(left: string, right: string) {
  const leftIndex = SLOT_ORDER.indexOf(left as (typeof SLOT_ORDER)[number])
  const rightIndex = SLOT_ORDER.indexOf(right as (typeof SLOT_ORDER)[number])

  if (leftIndex === -1 && rightIndex === -1) {
    return left.localeCompare(right, 'zh-CN')
  }

  if (leftIndex === -1) {
    return 1
  }

  if (rightIndex === -1) {
    return -1
  }

  return leftIndex - rightIndex
}

export function getWorkspaceDraftSlotFields(
  slots: Record<string, string>
): WorkspaceDraftSlotField[] {
  return Object.entries(slots)
    .filter(([key, value]) => key === 'dueAt' || value.trim().length > 0)
    .sort(([left], [right]) => compareSlotKeys(left, right))
    .map(([key, value]) => ({
      key,
      label: SLOT_LABELS[key] ?? key,
      value,
      type: key === 'dueAt' ? 'datetime' : key === 'url' ? 'url' : 'text',
    }))
}

export function formatWorkspaceDraftSlotValue(field: WorkspaceDraftSlotField) {
  if (field.type === 'datetime') {
    try {
      return formatAbsoluteDateTime(field.value)
    } catch {
      return field.value
    }
  }

  return field.value
}
