'use client'

import { useMemo } from 'react'

import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  BOLD_ITALIC_STAR,
  BOLD_STAR,
  CODE,
  HEADING,
  INLINE_CODE,
  ITALIC_STAR,
  LINK,
  ORDERED_LIST,
  QUOTE,
  UNORDERED_LIST,
} from '@lexical/markdown'
import { CodeNode } from '@lexical/code'
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { LinkNode } from '@lexical/link'
import { ListItemNode, ListNode } from '@lexical/list'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'

import { cn } from '@/lib/utils'

const NOTE_MARKDOWN_TRANSFORMERS = [
  HEADING,
  QUOTE,
  ORDERED_LIST,
  UNORDERED_LIST,
  CODE,
  LINK,
  INLINE_CODE,
  BOLD_STAR,
  ITALIC_STAR,
  BOLD_ITALIC_STAR,
]

export function NoteInlineEditor({
  markdown,
  ariaLabel,
  className,
  onMarkdownChange,
  onBlur,
  onSubmitShortcut,
}: {
  markdown: string
  ariaLabel: string
  className?: string
  onMarkdownChange: (markdown: string) => void
  onBlur: () => void
  onSubmitShortcut: () => void
}) {
  const initialConfig = useMemo(
    () => ({
      namespace: 'workspace-note-inline-editor',
      nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, LinkNode, CodeNode],
      onError(error: Error) {
        throw error
      },
      editorState: () => $convertFromMarkdownString(markdown, NOTE_MARKDOWN_TRANSFORMERS),
      theme: {
        link: 'text-primary underline underline-offset-4',
        paragraph: 'mb-0',
        heading: {
          h1: 'font-headline text-[1.05rem] font-semibold leading-7 tracking-[-0.015em] text-on-surface',
          h2: 'font-headline text-[1rem] font-semibold leading-7 tracking-[-0.012em] text-on-surface',
          h3: 'font-headline text-[0.96rem] font-semibold leading-7 text-on-surface',
        },
        list: {
          ul: 'ml-5 list-disc',
          ol: 'ml-5 list-decimal',
          listitem: 'pl-1',
          nested: {
            listitem: 'pl-1',
          },
        },
        quote: 'border-l-2 border-border pl-4 text-on-surface-variant',
        code: 'rounded bg-muted px-1.5 py-0.5 text-[0.92em]',
        text: {
          bold: 'font-semibold',
          italic: 'italic',
          underline: 'underline underline-offset-4',
          strikethrough: 'line-through',
        },
      },
    }),
    [markdown]
  )

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className={cn('rounded-[12px] bg-transparent px-0 py-0 shadow-none', className)}>
        <RichTextPlugin
          contentEditable={
            <ContentEditable
              aria-label={ariaLabel}
              aria-multiline="true"
              role="textbox"
              className={cn(
                'min-h-[132px] whitespace-pre-wrap break-words outline-none',
                'text-[15px] leading-7 text-on-surface md:text-[16px]',
                '[&_h1]:font-headline [&_h1]:text-[1.05rem] [&_h1]:font-semibold [&_h1]:leading-7',
                '[&_h2]:font-headline [&_h2]:text-[1rem] [&_h2]:font-semibold [&_h2]:leading-7',
                '[&_h3]:font-headline [&_h3]:text-[0.96rem] [&_h3]:font-semibold [&_h3]:leading-7',
                '[&_ol]:ml-5 [&_ol]:list-decimal [&_ol]:space-y-2',
                '[&_ul]:ml-5 [&_ul]:list-disc [&_ul]:space-y-2',
                '[&_p]:min-h-[1.75rem]'
              )}
              onBlur={onBlur}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                  event.preventDefault()
                  onSubmitShortcut()
                }
              }}
            />
          }
          placeholder={
            <div className="pointer-events-none absolute top-3 left-3 text-[15px] leading-7 text-muted-foreground md:text-[16px]">
              开始记录...
            </div>
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
        <OnChangePlugin
          onChange={(editorState) => {
            editorState.read(() => {
              onMarkdownChange($convertToMarkdownString(NOTE_MARKDOWN_TRANSFORMERS))
            })
          }}
        />
        <HistoryPlugin />
        <MarkdownShortcutPlugin transformers={NOTE_MARKDOWN_TRANSFORMERS} />
        <AutoFocusPlugin />
      </div>
    </LexicalComposer>
  )
}
