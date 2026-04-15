# Coding Style Rules

## 1. Purpose

This document defines repository-wide coding style rules to keep code readable, consistent, and easy to evolve.

It governs style and expression, not architecture ownership or framework behavior.

## 2. Core Principles

1. Readability first, cleverness second.
2. Consistency over personal preference.
3. Explicit intent over implicit convention.
4. Lowest cognitive load wins.
5. Minimal-but-clear code, never minimal-at-all-costs.

## 3. Import and Export Rules

### 3.1 Type imports must be explicit

Rules:

1. Use `import type` for type-only imports.
2. Use `export type` for type-only exports.
3. Never hide type imports inside runtime imports.

Examples:

```ts
import { createUser, type User } from './user'
import type { Session } from '@/shared/types'
export type { UserProfile }
```

### 3.2 Prefer shortest clear import path

Rules:

1. Choose the shortest path that remains clear.
2. Use relative paths for nearby modules when readable.
3. Use alias paths when relative depth harms readability.
4. Do not enforce aliases everywhere for appearance.

### 3.3 No unnecessary `as` rename

Rules:

1. `as` is allowed only for real naming conflicts or true ambiguity.
2. Do not rename imports for personal taste.
3. Keep original names when no conflict exists.

### 3.4 Stable import ordering

Recommended group order:

1. platform/standard library
2. third-party packages
3. internal alias imports
4. relative imports
5. type imports grouped with their source

Rules:

1. Keep grouping stable and predictable.
2. Do not mix unrelated sources randomly.
3. Remove all unused imports, including type imports.

### 3.5 Export surface must stay minimal

Rules:

1. Export only required public API.
2. Avoid broad re-export chains that hide real ownership.
3. Use barrels only when they improve discoverability without obscuring source.

## 4. Naming Rules

1. Names must express real domain meaning.
2. Booleans should read as conditions (`is`, `has`, `can`, `should`).
3. Avoid nonstandard abbreviations.
4. Keep naming role-consistent:
   - types/interfaces/classes: what it is
   - functions: what it does
   - variables: what value it holds
   - constants: stable immutable meaning

## 5. Function Rules

1. One function should own one primary responsibility.
2. Make inputs/outputs explicit; avoid hidden dependency coupling.
3. Prefer early return and flat control flow.
4. Split functions when semantic phases become mixed.
5. Keep function length within easy local understanding.

## 6. Data and Variable Rules

1. Keep variable scope as small as possible.
2. Avoid one concept with many names and one name with many meanings.
3. Keep object shapes stable and predictable.
4. Normalize external raw data early before wider use.

## 7. Conditions and Control Flow

1. Write direct, positive, readable conditions.
2. Avoid double negatives and overloaded one-line condition logic.
3. Extract complex conditions into named booleans or predicate helpers.

## 8. Comment Rules

1. Comments explain why, not what obvious code already says.
2. Keep comments current; remove stale comments immediately.
3. Do not keep large blocks of commented-out dead code.

## 9. Formatting Rules

1. Keep formatting deterministic and machine-friendly.
2. Wrap long statements where readability improves.
3. Keep related code visually close; avoid noisy blank-line usage.
4. Do not compress code into dense unreadable one-liners.

## 10. Redundancy and Abstraction

1. Do not add nonessential wrappers, aliases, exports, or comments.
2. Abstract only when it clearly reduces repetition or complexity.
3. Avoid speculative abstractions for uncertain future reuse.

## 11. Review Checklist

Before submitting changes, verify:

1. Type imports/exports are explicit (`import type` / `export type`).
2. Import paths are shortest and clear.
3. No unnecessary `as` renaming exists.
4. Import order/grouping is stable; no unused imports remain.
5. Public exports are minimal and intentional.
6. Naming is semantic and boolean naming is readable.
7. Functions are focused; nesting is controlled.
8. Complex conditions are named.
9. Data shapes are stable and external raw data is normalized.
10. Comments explain rationale and contain no stale notes.
11. Code is concise without harming clarity.

## 12. Relation to Other Rules

1. Use this file for coding style decisions.
2. Use architecture rules for ownership and placement decisions.
3. Use testing rules for verification strategy.
4. If conflicts appear, follow instruction priority from `AGENTS.md`.
