# Phase 5 Capability Matrix

## Overview

**Goal:** Extract Search and AI capabilities from `server/assets/` into dedicated `server/search/` and `server/ai/` modules with unified contracts, fallback policies, and centralized configuration.

**Current State:** All search and AI logic resides in `server/assets/`. Phase 5 modularizes these into separate capability centers.

---

## 1. Search Capabilities

### 1.1 Query Parse

| Capability | Current Location | Target Module | Status |
|------------|-----------------|---------------|--------|
| Query normalization (normalizeSearchText) | `assets.service.ts:85-91` | `server/search/search.query-parser.ts` | To create |
| Query term extraction (getAssetSearchTerms) | `assets.service.ts:93-108` | `server/search/search.query-parser.ts` | To create |
| Type hint scoring (getTypeHintScore) | `assets.service.ts:116-118` | `server/search/search.query-parser.ts` | To create |
| Time hint parsing | `assets.time.ts`, `assets.search-time.ts` | `server/search/search.query-parser.ts` | To create |

### 1.2 Keyword Search

| Capability | Current Location | Target Module | Status |
|------------|-----------------|---------------|--------|
| Keyword scoring (scoreAssetForQuery) | `assets.service.ts:120-145` | `server/search/search.ranker.ts` | To create |
| Asset filtering | `assets.service.ts:226-241` | `server/search/keyword-search.service.ts` | To create |

### 1.3 Semantic Search

| Capability | Current Location | Target Module | Status |
|------------|-----------------|---------------|--------|
| Embedding creation | `assets.embedding.service.ts:44-88` | `server/search/semantic-search.service.ts` | To create |
| Embedding search | `assets.embedding.service.ts:135-201` | `server/search/semantic-search.service.ts` | To create |
| Best-effort embedding | `assets.embedding.service.ts:90-100` | `server/search/semantic-search.service.ts` | To create |
| Backfill embeddings | `assets.embedding.service.ts:102-133` | `server/search/semantic-search.service.ts` | To create |

### 1.4 Search Ranking

| Capability | Current Location | Target Module | Status |
|------------|-----------------|---------------|--------|
| Merge strategy (semantic + keyword) | `assets.service.ts:243-264` | `server/search/search.ranker.ts` | To create |
| Score combination | `assets.service.ts:243-264` | `server/search/search.ranker.ts` | To create |
| Result truncation | `assets.service.ts:261-264` | `server/search/search.ranker.ts` | To create |

### 1.5 Search Logging

| Capability | Current Location | Target Module | Status |
|------------|-----------------|---------------|--------|
| Search path logging | `assets.search-logging.ts` | `server/search/` | Migrate |
| Logging data structure | `assets.search-logging.pure.ts` | `server/search/` | Migrate |

### 1.6 Search Fallback

| Capability | Current Location | Target Module | Status |
|------------|-----------------|---------------|--------|
| Semantic failure fallback | `assets.service.ts:210-215` | `server/search/search.fallback-policy.ts` | To create |
| Keyword-only fallback | `assets.service.ts:226-241` | `server/search/search.fallback-policy.ts` | To create |
| Empty result handling | `assets.service.ts:256-279` | `server/search/search.fallback-policy.ts` | To create |

---

## 2. AI Capabilities

### 2.1 AI Provider

| Capability | Current Location | Target Module | Status |
|------------|-----------------|---------------|--------|
| Provider creation | `assets.ai-provider.ts` | `server/ai/ai-provider.ts` | Migrate |
| Model configuration | `assets.ai-provider.ts` | `server/ai/ai-provider.ts` | Migrate |

### 2.2 AI Input Interpretation

| Capability | Current Location | Target Module | Status |
|------------|-----------------|---------------|--------|
| Intent classification | `assets.interpreter.ts:295-336` | `server/ai/ai-runner.ts` | Migrate |
| Rule-based fallback | `assets.interpreter.ts:61-114` | `server/ai/ai-runner.ts` | Migrate |
| Response normalization | `assets.interpreter.ts:132-240` | `server/ai/ai-runner.ts` | Migrate |
| Prompt management | `assets.interpreter.ts:242-293` | `server/ai/ai.prompts.ts` | Extract |
| Input schema | `assets.ai.schema.ts` | `server/ai/ai-schema.ts` | Migrate |

### 2.3 AI Summarization (Notes)

| Capability | Current Location | Target Module | Status |
|------------|-----------------|---------------|--------|
| Note summary generation | `assets.note-summary.ts` | `server/notes/notes.summary.service.ts` | Migrate |
| Fallback summary | `assets.note-summary.ts:22-31` | `server/notes/notes.summary.service.ts` | Migrate |
| Summary prompts | `assets.note-summary.pure.ts` | `server/notes/` | Migrate |
| Summary schema | `assets.note-summary.schema.ts` | `server/notes/` | Migrate |

### 2.4 AI Review (Todos)

| Capability | Current Location | Target Module | Status |
|------------|-----------------|---------------|--------|
| Todo review generation | `assets.todo-review.ts` | `server/todos/todos.review.service.ts` | Migrate |
| Fallback review | `assets.todo-review.ts:51-52` | `server/todos/todos.review.service.ts` | Migrate |
| Review prompts | `assets.todo-review.pure.ts` | `server/todos/` | Migrate |
| Review schema | `assets.todo-review.schema.ts` | `server/todos/` | Migrate |

### 2.5 AI Summarization (Bookmarks)

| Capability | Current Location | Target Module | Status |
|------------|-----------------|---------------|--------|
| Bookmark summary generation | `assets.bookmark-summary.ts` | `server/bookmarks/bookmarks.summary.service.ts` | Migrate |
| Fallback summary | `assets.bookmark-summary.ts:54-55` | `server/bookmarks/bookmarks.summary.service.ts` | Migrate |
| Summary prompts | `assets.bookmark-summary.pure.ts` | `server/bookmarks/` | Migrate |
| Summary schema | `assets.bookmark-summary.schema.ts` | `server/bookmarks/` | Migrate |

### 2.6 AI Error Handling

| Capability | Current Location | Target Module | Status |
|------------|-----------------|---------------|--------|
| Timeout errors | Inline in each service | `server/ai/ai.errors.ts` | Extract |
| Schema errors | Inline in each service | `server/ai/ai.errors.ts` | Extract |
| Provider errors | Inline in each service | `server/ai/ai.errors.ts` | Extract |

---

## 3. Configuration

### 3.1 Search Configuration

| Constant | Current Location | Target Module | Status |
|----------|-----------------|---------------|--------|
| Search limits | `constants.ts:18-24` | `server/config/search.ts` | Extract |
| Embedding timeout | `constants.ts:3` | `server/config/search.ts` | Extract |
| Embedding thresholds | `constants.ts:4-7` | `server/config/search.ts` | Extract |

### 3.2 AI Configuration

| Constant | Current Location | Target Module | Status |
|----------|-----------------|---------------|--------|
| Model timeouts | `constants.ts:13-16` | `server/config/ai.ts` | Extract |
| Summary limits | `constants.ts:9-11` | `server/config/ai.ts` | Extract |

---

## 4. Legacy Bridges (Phase 4) - To Remove

| File | Purpose | Action |
|------|---------|--------|
| `assets.ai-provider.ts` | Phase 4 AI provider bridge | Delete after migration |
| `assets.ai.schema.ts` | Phase 4 AI schema bridge | Delete after migration |
| `assets.note-summary.ts` | Phase 4 note summary bridge | Delete after migration |
| `assets.todo-review.ts` | Phase 4 todo review bridge | Delete after migration |
| `assets.bookmark-summary.ts` | Phase 4 bookmark summary bridge | Delete after migration |

---

## 5. Dependency Direction (Target)

```
app/ (routes)
  └── application/ (use cases - orchestrators only)
        ├── server/assets/ (asset aggregation root)
        │     └── server/search/ (search capability center)
        │           ├── search.types.ts
        │           ├── search.query-parser.ts
        │           ├── search.ranker.ts
        │           ├── keyword-search.service.ts
        │           ├── semantic-search.service.ts
        │           ├── assets-search.service.ts
        │           └── search.fallback-policy.ts
        │     └── server/ai/ (AI capability center)
        │           ├── ai.types.ts
        │           ├── ai.errors.ts
        │           ├── ai.prompts.ts
        │           ├── ai-provider.ts
        │           ├── ai-schema.ts
        │           ├── ai-runner.ts
        │           └── ai.fallback-policy.ts
        ├── server/notes/ (domain - uses AI center)
        ├── server/todos/ (domain - uses AI center)
        └── server/bookmarks/ (domain - uses AI center)

server/config/ (centralized configuration)
  ├── search.ts
  └── ai.ts

shared/ (cross-runtime types/constants)
  └── assets/
```

---

## 6. Test Coverage Goals

| Module | Tests to Add |
|--------|-------------|
| `search.query-parser` | Query normalization, term extraction, type hint scoring |
| `search.ranker` | Merge strategy, score combination, truncation |
| `search.fallback-policy` | Semantic failure, keyword-only, empty results |
| `ai-runner` | Provider success, timeout, schema fail, retry success/fail |
| `ai-fallback-policy` | Model failure, schema failure, timeout scenarios |

---

## 7. Exit Criteria

- [ ] `server/search/` exists with normalized contracts
- [ ] `server/ai/` exists with unified execution runner
- [ ] `server/config/search.ts` and `server/config/ai.ts` centralized
- [ ] Legacy bridges removed or deprecated
- [ ] All search/AI paths independently testable
- [ ] No cross-domain dependencies on `server/assets/` for search/AI capabilities
