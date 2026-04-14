'use client'

import {
  createWorkspaceAssetAction,
  setTodoCompletionAction,
  reviewUnfinishedTodosAction,
  summarizeRecentNotesAction,
  summarizeRecentBookmarksAction,
  type WorkspaceAssetActionResult,
} from '@/app/workspace/actions'
import type { AssetListItem } from '@/server/assets/assets.service'

export type { WorkspaceAssetActionResult }

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

export async function reviewUnfinishedTodos(): Promise<WorkspaceAssetActionResult> {
  return reviewUnfinishedTodosAction()
}

export async function summarizeRecentNotes(): Promise<WorkspaceAssetActionResult> {
  return summarizeRecentNotesAction()
}

export async function summarizeRecentBookmarks(): Promise<WorkspaceAssetActionResult> {
  return summarizeRecentBookmarksAction()
}
