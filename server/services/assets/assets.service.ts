import 'server-only'

import { createAsset, type AssetSummaryCommand } from './assets.command'
import { toAssetListItem } from './assets.mapper'
import {
  type AssetListItem,
  listAssets,
  listIncompleteTodoAssets,
  listLinkAssets,
  listNoteAssets,
  listRecentAssets,
  listTodoAssets,
} from './assets.query'
import { setTodoCompletion } from './assets.todo-mutation'

export {
  type AssetListItem,
  type AssetSummaryCommand,
  createAsset,
  listAssets,
  listIncompleteTodoAssets,
  listLinkAssets,
  listNoteAssets,
  listRecentAssets,
  listTodoAssets,
  setTodoCompletion,
  toAssetListItem,
}
