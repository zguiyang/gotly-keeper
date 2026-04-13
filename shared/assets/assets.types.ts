export type AssetListItem = {
  id: string
  originalText: string
  title: string
  excerpt: string
  type: 'note' | 'link' | 'todo'
  url: string | null
  timeText: string | null
  dueAt: Date | null
  completed: boolean
  createdAt: Date
}

export type AssetQueryResult = {
  query: string
  results: AssetListItem[]
}

export type TodoReviewSource = {
  id: string
  title: string
  timeText: string | null
  dueAt: Date | null
}

export type TodoReviewResult = {
  headline: string
  summary: string
  nextActions: string[]
  sourceAssetIds: string[]
  sources: TodoReviewSource[]
  generatedAt: Date
}

export type WorkspaceAssetActionResult =
  | { kind: 'created'; asset: AssetListItem }
  | { kind: 'query'; query: string; results: AssetListItem[] }
  | { kind: 'todo-review'; review: TodoReviewResult }
