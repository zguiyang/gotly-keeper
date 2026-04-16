'use client'

import { Share2, Trash2, Bookmark, ExternalLink } from 'lucide-react'

import { type AssetListItem } from '@/shared/assets/assets.types'
import { BOOKMARK_META_STATUS } from '@/shared/assets/bookmark-meta.types'
import { formatBookmarkTime } from '@/shared/time/formatters'

function getHostname(url: string | null) {
  if (!url) return 'saved link'

  try {
    return new URL(url).hostname
  } catch {
    return 'saved link'
  }
}

function BookmarkItem({ item }: { item: AssetListItem }) {
  const status = item.bookmarkMeta?.status ?? null

  return (
    <div className="group py-6 lg:py-8 transition-all hover:bg-surface-container-low/50 -mx-4 px-4 rounded-lg">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div className="flex-1 space-y-2 min-w-0">
          <div className="flex items-center space-x-3 flex-wrap">
            <span className="text-xs font-semibold uppercase tracking-widest text-primary-container bg-primary/10 px-2 py-0.5 rounded-sm">
              {getHostname(item.url)}
            </span>
            {status === BOOKMARK_META_STATUS.PENDING && (
              <span className="text-xs text-amber-700 bg-amber-100 px-2 py-0.5 rounded-sm">解析中</span>
            )}
            {status === BOOKMARK_META_STATUS.SUCCESS && (
              <span className="text-xs text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-sm">已补全</span>
            )}
            {status === BOOKMARK_META_STATUS.FAILED && (
              <span className="text-xs text-red-700 bg-red-100 px-2 py-0.5 rounded-sm">补全失败</span>
            )}
            {status === BOOKMARK_META_STATUS.SKIPPED_PRIVATE_URL && (
              <span className="text-xs text-slate-700 bg-slate-100 px-2 py-0.5 rounded-sm">私网地址已跳过</span>
            )}
            <span className="text-xs text-on-surface-variant/60 hidden sm:block">
              {formatBookmarkTime(item.createdAt)}
            </span>
          </div>
          {item.url ? (
            <a href={item.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 group/title">
              {item.bookmarkMeta?.icon && (
                <img
                  src={item.bookmarkMeta.icon}
                  alt=""
                  className="w-4 h-4 rounded-sm shrink-0"
                  loading="lazy"
                />
              )}
              <h3 className="text-base lg:text-xl font-bold text-on-surface group-hover/title:text-primary transition-colors cursor-pointer leading-snug line-clamp-2 lg:line-clamp-none">
                {item.title}
              </h3>
              <ExternalLink className="w-3.5 h-3.5 text-on-surface-variant/40 opacity-0 group-hover/title:opacity-100 transition-opacity shrink-0" />
            </a>
          ) : (
            <div className="flex items-center gap-1.5">
              <h3 className="text-base lg:text-xl font-bold text-on-surface leading-snug line-clamp-2 lg:line-clamp-none">
                {item.title}
              </h3>
            </div>
          )}
          <p className="text-on-surface-variant text-sm leading-relaxed max-w-3xl line-clamp-2 sm:line-clamp-3 lg:line-clamp-none">
            {item.excerpt}
          </p>
          <span className="text-xs text-on-surface-variant/60 sm:hidden">{formatBookmarkTime(item.createdAt)}</span>
        </div>
        <div className="flex items-center space-x-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity lg:opacity-100">
          <button
            className="p-2 text-on-surface-variant hover:text-primary transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 rounded-sm"
            aria-label="分享收藏"
          >
            <Share2 className="w-4 h-4" />
          </button>
          <button
            className="p-2 text-on-surface-variant hover:text-error transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 rounded-sm"
            aria-label="删除收藏"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

function Divider() {
  return <div className="h-px bg-outline-variant opacity-10 mx-4" />
}

export function BookmarksClient({ bookmarks }: { bookmarks: AssetListItem[] }) {
  return (
    <>
      <div className="mb-10">
        <h1 className="text-2xl lg:text-3xl font-bold text-on-surface tracking-tight mb-2 font-[family-name:var(--font-manrope)]">
          我的收藏
        </h1>
        <p className="text-on-surface-variant text-base">
          已为您整理好，随时可查。
        </p>
      </div>

      <div className="max-w-6xl">
        <div className="space-y-0">
          {bookmarks.map((item, index) => (
            <div key={item.id}>
              <BookmarkItem item={item} />
              {index < bookmarks.length - 1 && <Divider />}
            </div>
          ))}
        </div>

        {bookmarks.length === 0 && (
          <div className="mt-20 text-center py-12">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 rounded-full bg-surface-container-low flex items-center justify-center">
                <Bookmark className="w-6 h-6 text-on-surface-variant" />
              </div>
            </div>
            <p className="text-sm text-on-surface-variant font-medium">
              暂无书签
            </p>
          </div>
        )}
      </div>
    </>
  )
}
