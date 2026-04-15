# Assets Capability Owner Matrix

```yaml
phase_id: phase-assets-owner-matrix
generated_at: 2026-04-15T14:25:00+0800
purpose: Establish Single Source of Truth for assets/search/notes/todos/bookmarks capabilities
```

## Rule: Canonical Owner Only

**All future changes MUST only modify the canonical owner file.**
Legacy duplicate files must NOT be modified. Any modification to legacy files is a violation of this phase's goal.

---

## Capability Matrix

| Capability | Owner Domain | Canonical File | Legacy Duplicate | Migration Action | Reasoning |
|---|---|---|---|---|---|
| Asset Query/List | assets.query | `server/assets/assets.query.ts` | - | keep | Core DB query layer; all listing functions originate here |
| Asset Search (keyword + semantic routing) | search | `server/search/assets-search.service.ts` | - | keep | Search orchestration lives in search module; assets.query is thin wrapper |
| Asset Semantic Embedding | assets.embedding | `server/assets/assets.embedding.service.ts` | - | keep | Embedding creation and vector search are tightly coupled; keeping together |
| Semantic Search Service | search | `server/search/semantic-search.service.ts` | - | keep | High-level semantic search that uses embedding service |
| Todo Mutation (set completion) | assets.mutation | `server/assets/assets.todo-mutation.ts` | - | keep | Simple DB update; no duplication |
| **Notes Summary** | **notes.summary** | **`server/notes/notes.summary.service.ts`** | `server/assets/assets.note-summary.ts` | **freeze** | **Canonical is `server/notes/`; assets version is unused legacy; freeze & deprecate** |
| **Todo Review** | **todos.review** | **`server/todos/todos.review.service.ts`** | `server/assets/assets.todo-review.ts` | **freeze** | **Canonical is `server/todos/`; assets version is unused legacy; freeze & deprecate** |
| **Bookmark Summary** | **bookmarks.summary** | **`server/bookmarks/bookmarks.summary.service.ts`** | `server/assets/assets.bookmark-summary.ts` | **freeze** | **Canonical is `server/bookmarks/`; assets version is unused legacy; freeze & deprecate** |
| **Search Time Matching** | **search** | **`server/search/search.time-match.pure.ts`** + **`server/search/search.time-match.ts`** | `server/assets/assets.search-time.pure.ts` + `server/assets/assets.search-time.ts` | **freeze** | **Canonical is `server/search/`; assets versions are unused legacy; freeze & deprecate** |
| **Search Logging** | **search** | **`server/search/search.logging.pure.ts`** + **`server/search/search.logging.ts`** | `server/assets/assets.search-logging.pure.ts` + `server/assets/assets.search-logging.ts` | **freeze** | **Canonical is `server/search/`; assets versions are unused legacy; freeze & deprecate** |
| Summary Intent Detection | assets.interpreter | `server/assets/assets.summary-intent.pure.ts` | - | keep | Pure intent detection; used by both search and assets interpreter |
| Query Parser | search | `server/search/search.query-parser.ts` | - | keep | Search module owns query parsing |
| Search Ranker | search | `server/search/search.ranker.ts` | - | keep | Search module owns ranking logic |
| Fallback Policy | search | `server/search/search.fallback-policy.ts` | - | keep | Search module owns fallback logic |
| Keyword Search | search | `server/search/keyword-search.service.ts` | - | keep | Standalone keyword search service |
| Interpreter (asset command parsing) | assets.interpreter | `server/assets/assets.interpreter.ts` | - | keep | Assets module owns command interpretation |
| Classifier | assets.classifier | `server/assets/assets.classifier.ts` | - | keep | Assets module owns classification |
| Asset Command | assets.command | `server/assets/assets.command.ts` | - | keep | Assets module owns command creation |
| Asset Mapper | assets.mapper | `server/assets/assets.mapper.ts` | - | keep | DB row to DTO mapping |
| Repository | assets.repository | `server/assets/assets.repository.ts` | - | keep | Data access abstraction |
| Embedding Provider | assets.embedding | `server/assets/assets.embedding-provider.ts` | - | keep | AI provider for embeddings |
| Embedding Scheduler | assets.embedding | `server/assets/assets.embedding-scheduler.ts` | - | keep | Batch embedding scheduling |
| Types | assets.types | `server/assets/assets.types.ts` | - | keep | Core asset type definitions |
| Assets Index | assets.index | `server/assets/index.ts` | - | keep | Public API re-exports |

---

## Schema Files (Associated with Canonical Services)

| Schema | Owner Domain | Canonical Location | Legacy Location | Migration Action |
|---|---|---|---|---|
| Note Summary Output Schema | notes.summary | `server/notes/notes.summary.service.ts` (inline) | `server/assets/assets.note-summary.schema.ts` | freeze |
| Todo Review Output Schema | todos.review | `server/todos/todos.review.service.ts` (inline) | `server/assets/assets.todo-review.schema.ts` | freeze |
| Bookmark Summary Output Schema | bookmarks.summary | `server/bookmarks/bookmarks.summary.service.ts` (inline) | `server/assets/assets.bookmark-summary.schema.ts` | freeze |
| Note Summary Prompt Builder | notes.summary | - | `server/assets/assets.note-summary.pure.ts` | freeze |
| Todo Review Prompt Builder | todos.review | - | `server/assets/assets.todo-review.pure.ts` | freeze |
| Bookmark Summary Prompt Builder | bookmarks.summary | - | `server/assets/assets.bookmark-summary.pure.ts` | freeze |

**Note:** The standalone services (`server/notes/`, `server/todos/`, `server/bookmarks/`) define schemas and prompt builders inline. The `server/assets/` versions are legacy duplicates that must not be modified.

---

## Frozen Files (DO NOT MODIFY)

The following files are legacy duplicates and MUST NOT be modified. Any bug fixes or enhancements must be made to the canonical file only.

### Summary/Review Duplicates

- `server/assets/assets.note-summary.ts`
- `server/assets/assets.note-summary.pure.ts`
- `server/assets/assets.note-summary.schema.ts`

- `server/assets/assets.todo-review.ts`
- `server/assets/assets.todo-review.pure.ts`
- `server/assets/assets.todo-review.schema.ts`

- `server/assets/assets.bookmark-summary.ts`
- `server/assets/assets.bookmark-summary.pure.ts`
- `server/assets/assets.bookmark-summary.schema.ts`

### Search Duplicates

- `server/assets/assets.search-time.ts`
- `server/assets/assets.search-time.pure.ts`

- `server/assets/assets.search-logging.ts`
- `server/assets/assets.search-logging.pure.ts`

---

## Import Dependencies (Canonical Sources)

```
server/application/workspace/
  ├── create-workspace-asset.use-case.ts  →  server/notes/notes.summary.service.ts
  │                                          server/todos/todos.review.service.ts
  │                                          server/bookmarks/bookmarks.summary.service.ts
  ├── summarize-recent-notes.use-case.ts   →  server/notes/notes.summary.service.ts
  ├── summarize-recent-bookmarks.use-case.ts →  server/bookmarks/bookmarks.summary.service.ts
  └── review-unfinished-todos.use-case.ts  →  server/todos/todos.review.service.ts

server/search/
  ├── assets-search.service.ts            →  server/search/search.time-match.ts
  │                                          server/search/search.logging.ts
  │                                          server/search/semantic-search.service.ts
  └── semantic-search.service.ts          →  server/assets/assets.embedding.service.ts
```

**Note:** The `server/assets/index.ts` re-exports from `server/notes/`, `server/todos/`, `server/bookmarks/` but these canonical files are imported directly by use cases. The `server/assets/assets.*.summary/review` files in `server/assets/` are NOT imported by anything and are legacy.

---

## Migration Actions Defined

| Action | Meaning |
|---|---|
| **keep** | File is canonical; continue modifying here |
| **freeze** | File is legacy duplicate; do NOT modify; serves as backup reference |
| **remove** | File should be deleted in a future phase (not this phase) |

---

## Phase 1 Deliverable

This matrix is the **Single Source of Truth** for determining:
1. Which file owns which capability
2. Which files are legacy duplicates (frozen)
3. Which files may be safely modified for future changes

Subsequent phases (Phase 2+) will act on this matrix to remove legacy files.

(End of file - total 147 lines)
