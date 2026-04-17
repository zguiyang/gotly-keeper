'use client'

import {
  archiveWorkspaceAssetAction,
  createWorkspaceAssetAction,
  moveWorkspaceAssetToTrashAction,
  purgeWorkspaceAssetAction,
  restoreWorkspaceAssetFromTrashAction,
  setTodoCompletionAction,
  reviewUnfinishedTodosAction,
  summarizeRecentNotesAction,
  summarizeRecentBookmarksAction,
  unarchiveWorkspaceAssetAction,
  updateWorkspaceAssetAction,
} from '@/app/workspace/actions'

import type { AssetListItem, WorkspaceAssetActionResult } from '@/shared/assets/assets.types'

export type { WorkspaceAssetActionResult }

type WorkspaceAssetType = 'note' | 'todo' | 'link'

export async function createWorkspaceAsset(
  input: unknown
): Promise<WorkspaceAssetActionResult> {
  return createWorkspaceAssetAction(input)
}

export async function setTodoCompletion(
  input: unknown
): Promise<AssetListItem> {
  return setTodoCompletionAction(input)
}

export async function updateWorkspaceAsset(
  input: unknown
): Promise<AssetListItem> {
  return updateWorkspaceAssetAction(input)
}

export async function archiveWorkspaceAsset(input: {
  assetId: string
  assetType: WorkspaceAssetType
}): Promise<AssetListItem> {
  return archiveWorkspaceAssetAction(input)
}

export async function unarchiveWorkspaceAsset(input: {
  assetId: string
  assetType: WorkspaceAssetType
}): Promise<AssetListItem> {
  return unarchiveWorkspaceAssetAction(input)
}

export async function moveWorkspaceAssetToTrash(input: {
  assetId: string
  assetType: WorkspaceAssetType
}): Promise<AssetListItem> {
  return moveWorkspaceAssetToTrashAction(input)
}

export async function restoreWorkspaceAssetFromTrash(input: {
  assetId: string
  assetType: WorkspaceAssetType
}): Promise<AssetListItem> {
  return restoreWorkspaceAssetFromTrashAction(input)
}

export async function purgeWorkspaceAsset(input: {
  assetId: string
  assetType: WorkspaceAssetType
}): Promise<{ id: string; type: WorkspaceAssetType }> {
  return purgeWorkspaceAssetAction(input)
}

export async function reviewUnfinishedTodos(): Promise<WorkspaceAssetActionResult> {
  return reviewUnfinishedTodosAction()
}

export async function summarizeRecentNotes(): Promise<WorkspaceAssetActionResult> {
  return summarizeRecentNotesAction()
}

export async function summarizeRecentBookmarks(): Promise<WorkspaceAssetActionResult> {
  return summarizeRecentBookmarksAction()
}
