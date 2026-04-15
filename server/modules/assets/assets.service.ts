import {
  createAsset,
  listAssets,
  listIncompleteTodoAssets,
  listLinkAssets,
  listNoteAssets,
  listRecentAssets,
  listTodoAssets,
  setTodoCompletion,
  toAssetListItem,
} from '@/server/services/assets/assets.service'

import type { AssetListItem, AssetSummaryCommand } from '@/server/services/assets/assets.service'

export type { AssetListItem, AssetSummaryCommand }

type AssetType = 'note' | 'link' | 'todo'

export async function createWorkspaceAssetRecord(input: {
  userId: string
  text: string
}) {
  return createAsset(input)
}

export async function listWorkspaceAssets(input: {
  userId: string
  type?: AssetType
  limit?: number
}) {
  return listAssets(input)
}

export async function listWorkspaceIncompleteTodos(userId: string, limit?: number) {
  return listIncompleteTodoAssets(userId, limit)
}

export async function listWorkspaceLinkAssets(userId: string, limit?: number) {
  return listLinkAssets(userId, limit)
}

export async function listWorkspaceNoteAssets(userId: string, limit?: number) {
  return listNoteAssets(userId, limit)
}

export async function listWorkspaceRecentAssets(userId: string, limit?: number) {
  return listRecentAssets(userId, limit)
}

export async function listWorkspaceTodoAssets(userId: string, limit?: number) {
  return listTodoAssets(userId, limit)
}

export async function setWorkspaceTodoCompletion(input: {
  userId: string
  assetId: string
  completed: boolean
}) {
  return setTodoCompletion(input)
}

export function toWorkspaceAssetListItem(asset: Parameters<typeof toAssetListItem>[0]) {
  return toAssetListItem(asset)
}
