export type WorkspaceAgentTimeFilter =
  | { kind: 'none' }
  | {
      kind: 'exact_range'
      phrase: string
      startIso: string
      endIso: string
      basis: string
    }
  | {
      kind: 'vague'
      phrase: string
      reason: string
    }
