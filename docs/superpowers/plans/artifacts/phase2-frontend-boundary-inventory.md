# Phase 2 Frontend Boundary Migration Inventory

> Created: 2026-04-14
> Plan: `docs/superpowers/plans/2026-04-14-phase-2-frontend-boundary-cleanup-plan.md`

## Cross-Boundary Dependencies Detected

### 1. `components/workspace/workspace-action-state.ts`
- **Current Responsibility:** 状态机逻辑（action state management）
- **Target Directory:** `hooks/workspace/use-workspace-action-state.ts`
- **Migration Priority:** HIGH
- **Consumers:**
  - `components/workspace/workspace-client.tsx:29`

### 2. `components/workspace/todos-client.tsx`
- **Current Responsibility:** Todo 列表 UI + 直接调用 server actions
- **Target Directory:**
  - UI 保留在 `components/workspace/todos-client.tsx`
  - 调用逻辑迁移到 `hooks/workspace/use-todo-completion.ts`
  - Action adapter: `client/actions/workspace-actions.client.ts`
- **Migration Priority:** HIGH
- **Current跨界依赖:**
  - Line 7: `import { setTodoCompletionAction } from '@/app/workspace/actions'`
  - Line 8: `import { callAction } from '@/components/actions/call-action'`

### 3. `components/workspace/workspace-client.tsx`
- **Current Responsibility:** Workspace UI + 直接调用 server actions (createWorkspaceAsset, summarizeRecentNotes, etc.)
- **Target Directory:**
  - UI 保留在 `components/workspace/workspace-client.tsx`
  - 提交逻辑迁移到 `hooks/workspace/use-workspace-submit.ts`
  - Action adapter: `client/actions/workspace-actions.client.ts`
- **Migration Priority:** HIGH
- **Current跨界依赖:**
  - Line 6: `import { callAction } from '@/components/actions/call-action'`
  - Line 13: `import { createWorkspaceAsset, summarizeRecentNotes, summarizeRecentBookmarks, reviewUnfinishedTodos } from '@/app/workspace/actions'`

### 4. `components/actions/call-action.ts`
- **Current Responsibility:** Action 调用封装（Sonner toast 集成）
- **Target Directory:** `client/feedback/toast-action.ts`
- **Migration Priority:** HIGH
- **Consumers:**
  - `components/workspace/todos-client.tsx`
  - `components/workspace/workspace-client.tsx`

### 5. `components/workspace/nav-config.ts`
- **Current Responsibility:** 导航配置（可能只是 re-export）
- **Target Directory:** `config/workspace/nav.ts`（如果尚未存在则创建）
- **Migration Priority:** MEDIUM
- **Consumers:**
  - `components/workspace/sidebar.tsx`（待确认）
  - `components/workspace/top-app-bar.tsx`（待确认）

## Migration Strategy

### Phase 2 Target Architecture
```
components -> hooks -> client/actions -> app server actions
```

### New Files to Create
1. `hooks/workspace/use-workspace-action-state.ts` - 状态机 hook
2. `hooks/workspace/use-workspace-submit.ts` - 提交流程 hook
3. `hooks/workspace/use-todo-completion.ts` - Todo 完成流程 hook
4. `client/actions/workspace-actions.client.ts` - Workspace action adapter
5. `client/feedback/toast-action.ts` - Toast action 封装
6. `config/workspace/nav.ts` - 导航配置（如果尚未存在）

### Files to Modify (Keep UI, Move Logic)
1. `components/workspace/workspace-action-state.ts` - 变为 re-export 或删除
2. `components/workspace/workspace-client.tsx` - 移除 action 调用逻辑
3. `components/workspace/todos-client.tsx` - 移除 action 调用逻辑
4. `components/actions/call-action.ts` - 变为 re-export 或删除

### Files to Delete (After Transition)
1. `components/workspace/nav-config.ts`（如果只是 re-export）

## Exit Criteria Verification
- [ ] `components/**` 不再直接 import `app/**/actions`
- [ ] `components/**` 中无状态机/调用编排核心实现
- [ ] 调用链符合 `components -> hooks -> client/actions` 方向
- [ ] 导航配置统一由 `config/**` 提供
