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

type AssetEditValues = {
  text: string
  url?: string
}

function getTitle(asset: AssetListItem) {
  if (asset.type === 'note') return '编辑笔记'
  if (asset.type === 'todo') return '编辑待办'
  return '编辑书签'
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
  const [text, setText] = useState('')
  const [url, setUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setText(asset?.originalText ?? '')
    setUrl(asset?.url ?? '')
    setError(null)
    setSubmitting(false)
  }, [asset])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!asset || submitting) {
      return
    }

    const nextText = text.trim()
    const nextUrl = url.trim()

    if (!nextText) {
      setError('请输入内容')
      return
    }

    if (asset.type === 'link' && !nextUrl) {
      setError('请输入链接 URL')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const updated = await onSubmit(asset, {
        text: nextText,
        url: asset.type === 'link' ? nextUrl : undefined,
      })

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
              <FieldLabel htmlFor="asset-edit-text">内容</FieldLabel>
              <Textarea
                id="asset-edit-text"
                aria-invalid={!!error}
                className="min-h-28"
                value={text}
                onChange={(event) => setText(event.target.value)}
              />
              <FieldError>{error}</FieldError>
            </Field>

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
