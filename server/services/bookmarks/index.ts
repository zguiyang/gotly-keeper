import 'server-only'

export { type BookmarkListItem } from './bookmarks.types'
export { type Bookmark } from './bookmarks.schema'

export { createBookmark } from './bookmarks.command'
export {
  findDuplicateBookmarks,
  listBookmarks,
  listBookmarksPage,
  getBookmarkById,
  type BookmarkListItem as BookmarkListItemExport,
} from './bookmarks.query'
export {
  updateBookmarkEnrichment,
  updateBookmark,
  archiveBookmark,
  unarchiveBookmark,
  moveBookmarkToTrash,
  restoreBookmarkFromTrash,
  purgeBookmark,
} from './bookmarks.mutation'
export { toBookmarkListItem } from './bookmarks.mapper'
