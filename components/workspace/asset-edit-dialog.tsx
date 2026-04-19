'use client'

import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

import type { AssetListItem } from '@/shared/assets/assets.types'

type AssetEditFormState = {
  title: string
  content: string
  url: string
  timeText: string
}

export type NoteEditValues = {
  title?: string | null
  content?: string | null
  rawInput: string
}

export type TodoEditValues = {
  title?: string | null
  content?: string | null
  timeText?: string | null
  rawInput: string
}

export type LinkEditValues = {
  title?: string | null
  note?: string | null
  url: string
  rawInput: string
}

export type AssetEditValues = NoteEditValues | TodoEditValues | LinkEditValues

function getTitle(asset: AssetListItem) {
  if (asset.type === 'note') return '编辑笔记'
  if (asset.type === 'todo') return '编辑待办'
  return '编辑书签'
}

function normalizeEditableValue(value: string | null | undefined): string {
  return value?.trim() ?? ''
}

function buildStructuredRawInput(asset: AssetListItem, next: AssetEditFormState): string {
  const nextTitle = next.title.trim()
  const nextContent = next.content.trim()
  const nextUrl = next.url.trim()
  const nextTimeText = next.timeText.trim()

  if (asset.type === 'note') {
    return [nextTitle, nextContent].filter(Boolean).join('\n\n')
  }

  if (asset.type === 'todo') {
    return [nextTitle, nextContent, nextTimeText].filter(Boolean).join('\n')
  }

  return [nextTitle, nextContent, nextUrl].filter(Boolean).join('\n')
}

export function getAssetEditInitialState(asset: AssetListItem | null): AssetEditFormState {
  if (!asset) {
    return {
      title: '',
      content: '',
      url: '',
      timeText: '',
    }
  }

  return {
    title: asset.title ?? '',
    content: asset.type === 'link' ? asset.note ?? '' : asset.content ?? '',
    url: asset.url ?? '',
    timeText: asset.timeText ?? '',
  }
}

export function buildAssetEditValues(
  asset: AssetListItem,
  next: AssetEditFormState
): AssetEditValues | null {
  const initial = getAssetEditInitialState(asset)
  const nextTitle = normalizeEditableValue(next.title)
  const nextContent = normalizeEditableValue(next.content)
  const nextUrl = normalizeEditableValue(next.url)
  const nextTimeText = normalizeEditableValue(next.timeText)
  const initialTitle = normalizeEditableValue(initial.title)
  const initialContent = normalizeEditableValue(initial.content)
  const initialUrl = normalizeEditableValue(initial.url)
  const initialTimeText = normalizeEditableValue(initial.timeText)

  const titleChanged = nextTitle !== initialTitle
  const contentChanged = nextContent !== initialContent
  const urlChanged = nextUrl !== initialUrl
  const timeTextChanged = nextTimeText !== initialTimeText

  if (!titleChanged && !contentChanged && !urlChanged && !timeTextChanged) {
    return null
  }

  const canSafelyRebuildRawInput =
    asset.type === 'link' ? asset.note !== undefined || contentChanged : asset.content !== undefined || contentChanged

  const rawInput = canSafelyRebuildRawInput
    ? buildStructuredRawInput(asset, next).trim()
    : asset.originalText.trim()

  if (asset.type === 'note') {
    return {
      rawInput,
      ...(titleChanged ? { title: nextTitle || null } : {}),
      ...(contentChanged ? { content: nextContent || null } : {}),
    }
  }

  if (asset.type === 'todo') {
    return {
      rawInput,
      ...(titleChanged ? { title: nextTitle || null } : {}),
      ...(contentChanged ? { content: nextContent || null } : {}),
      ...(timeTextChanged ? { timeText: nextTimeText || null } : {}),
    }
  }

  return {
    rawInput,
    url: nextUrl,
    ...(titleChanged ? { title: nextTitle || null } : {}),
    ...(contentChanged ? { note: nextContent || null } : {}),
  }
}

export function AssetEditDialog({
  asset,
  onOpenChange,
  onSubmit,
}: {
  asset: AssetListItem | null
  onOpenChange: (open: boolean) => void
  onSubmit: (asset: AssetListItem, values: AssetEditValues) => Promise<boolean>
}) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [url, setUrl] = useState('')
  const [timeText, setTimeText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const initial = getAssetEditInitialState(asset)
    setTitle(initial.title)
    setContent(initial.content)
    setUrl(initial.url)
    setTimeText(initial.timeText)
    setError(null)
    setSubmitting(false)
  }, [asset])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!asset || submitting) {
      return
    }

    const nextTitle = title.trim()
    const nextContent = content.trim()
    const nextUrl = url.trim()
    const values = buildAssetEditValues(asset, { title, content, url, timeText })

    if (!nextTitle && !nextContent) {
      setError(asset.type === 'link' ? '请至少填写标题或备注' : '请至少填写标题或正文')
      return
    }

    if (asset.type === 'link' && !nextUrl) {
      setError('请输入链接 URL')
      return
    }

    if (!values) {
      onOpenChange(false)
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const updated = await onSubmit(asset, values)

      if (updated) {
        onOpenChange(false)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={asset !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{asset ? getTitle(asset) : '编辑内容'}</DialogTitle>
            <DialogDescription>保存后会更新当前工作区里的这条内容。</DialogDescription>
          </DialogHeader>

          <FieldGroup>
            <Field data-invalid={!!error}>
              <FieldLabel htmlFor="asset-edit-title">标题</FieldLabel>
              <Input
                id="asset-edit-title"
                aria-invalid={!!error}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
              <FieldError>{error}</FieldError>
            </Field>

            {asset?.type === 'todo' ? (
              <Field>
                <FieldLabel htmlFor="asset-edit-time">时间</FieldLabel>
                <Input
                  id="asset-edit-time"
                  value={timeText}
                  onChange={(event) => setTimeText(event.target.value)}
                />
              </Field>
            ) : null}

            {asset?.type === 'link' ? (
              <Field>
                <FieldLabel htmlFor="asset-edit-url">URL</FieldLabel>
                <Input
                  id="asset-edit-url"
                  type="url"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                />
              </Field>
            ) : null}

            <Field>
              <FieldLabel htmlFor="asset-edit-content">
                {asset?.type === 'note' ? '正文' : asset?.type === 'todo' ? '备注' : '备注'}
              </FieldLabel>
              <Textarea
                id="asset-edit-content"
                className="min-h-28"
                value={content}
                onChange={(event) => setContent(event.target.value)}
              />
            </Field>

          </FieldGroup>

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>取消</DialogClose>
            <Button type="submit" disabled={submitting}>
              {submitting ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
