'use client'

import Markdown from 'react-markdown'

import { cn } from '@/lib/utils'

export function NoteMarkdown({
  markdown,
  className,
}: {
  markdown: string
  className?: string
}) {
  return (
    <div className={cn('space-y-3 break-words text-[15px] leading-7 text-on-surface md:text-[16px]', className)}>
      <Markdown
        components={{
          h1: ({ className: nextClassName, ...props }) => (
            <h2 className={cn('font-headline text-[1.05rem] font-semibold leading-7 tracking-[-0.015em] text-on-surface', nextClassName)} {...props} />
          ),
          h2: ({ className: nextClassName, ...props }) => (
            <h3 className={cn('font-headline text-[1rem] font-semibold leading-7 tracking-[-0.012em] text-on-surface', nextClassName)} {...props} />
          ),
          h3: ({ className: nextClassName, ...props }) => (
            <h4 className={cn('font-headline text-[0.96rem] font-semibold leading-7 text-on-surface', nextClassName)} {...props} />
          ),
          p: ({ className: nextClassName, ...props }) => (
            <p className={cn('whitespace-pre-wrap text-on-surface', nextClassName)} {...props} />
          ),
          ul: ({ className: nextClassName, ...props }) => (
            <ul className={cn('ml-5 list-disc space-y-2 text-on-surface', nextClassName)} {...props} />
          ),
          ol: ({ className: nextClassName, ...props }) => (
            <ol className={cn('ml-5 list-decimal space-y-2 text-on-surface', nextClassName)} {...props} />
          ),
          li: ({ className: nextClassName, ...props }) => (
            <li className={cn('pl-1', nextClassName)} {...props} />
          ),
          a: ({ className: nextClassName, ...props }) => (
            <a className={cn('text-primary underline underline-offset-4', nextClassName)} {...props} />
          ),
          blockquote: ({ className: nextClassName, ...props }) => (
            <blockquote className={cn('border-l-2 border-border pl-4 text-on-surface-variant', nextClassName)} {...props} />
          ),
          code: ({ className: nextClassName, ...props }) => (
            <code className={cn('rounded bg-muted px-1.5 py-0.5 text-[0.92em]', nextClassName)} {...props} />
          ),
          pre: ({ className: nextClassName, ...props }) => (
            <pre className={cn('overflow-x-auto rounded-xl bg-muted/70 p-3 text-sm leading-6 text-on-surface', nextClassName)} {...props} />
          ),
        }}
      >
        {markdown}
      </Markdown>
    </div>
  )
}
