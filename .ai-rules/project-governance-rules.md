# Project Governance Rules

## 1. Purpose

This document defines repository governance rules that apply across the whole project.

It exists to keep the project itself clean, stable, and easy to understand while allowing AI-assisted workflows to remain useful without leaking into the product-facing repository surface.

Use this file when the task touches repository structure, documentation placement, scripts, templates, commit boundaries, local planning artifacts, or the boundary between project assets and AI workflow assets.

## 2. Scope

These rules govern:

- root-level repository structure
- directory responsibilities
- project entry surfaces such as `README.md`, `.github/`, `package.json`, and `scripts/`
- AI workflow assets and local planning workspaces
- what belongs in version control versus what should remain local-only

These rules do not replace code architecture rules, runtime rules, or test strategy rules. They define the governance layer above them.

## 3. Core Governance Principles

### 3.1 Project First

The repository must read as a product engineering project, not as an AI workbench.

Rules:

1. Repository-facing surfaces must prioritize product development and team collaboration.
2. AI workflow conveniences must not pollute project entry points or runtime-facing interfaces.
3. If a rule, script, document, or template exists only to support AI execution discipline, place it under the AI governance layer instead of the project layer.

### 3.2 Directory Names Must Mean Something

Directory placement is part of the architecture.

Rules:

1. Do not place files based only on convenience.
2. Every top-level directory must have a clear responsibility boundary.
3. If a file feels semantically out of place, move it instead of just documenting the inconsistency.

### 3.3 Single Source of Truth

Each class of rule or guidance must have one canonical home.

Rules:

1. Do not duplicate full rules across `AGENTS.md`, `README.md`, `.github/`, and `.ai-rules/`.
2. Keep `AGENTS.md` as the entry guide, not the full rule body.
3. Keep `.ai-rules/` as the canonical source of repository governance and implementation rules.
4. When a rule changes, update the canonical file instead of scattering patches elsewhere.

### 3.4 Local Working Material Is Not Automatically a Repository Asset

Planning artifacts, AI scratch work, PRDs, and execution notes are useful but are not default repository deliverables.

Rules:

1. Local workflow material must be explicitly separated from committed project assets.
2. If a planning or analysis artifact is needed only for local execution, keep it in a local AI workspace.
3. Do not commit local planning artifacts by default.

## 4. Repository Surface Rules

### 4.1 `README.md`

`README.md` is for humans approaching the project as a software product.

Allowed:

- project purpose
- setup steps
- runtime prerequisites
- commands needed to develop or run the project
- high-level architecture summary
- user-facing or contributor-facing development guidance

Forbidden:

- AI execution protocol details
- phase-plan metadata schemas
- AI-only guard commands
- local scratch-work instructions

### 4.2 `package.json`

`package.json` is for project runtime and development commands.

Allowed:

- app lifecycle commands such as `dev`, `build`, `start`
- project test commands
- database and migration commands
- project maintenance commands that materially support the software itself

Forbidden:

- AI workflow guard commands
- AI planning or documentation protocol validation commands
- commands that exist only to help an AI follow repository rules

If a command is useful only for AI governance, document it in `.ai-rules/` and run it directly instead of exposing it through `package.json`.

### 4.3 `scripts/`

`scripts/` is for project scripts, not generic repository miscellany.

Allowed:

- runtime helpers
- maintenance scripts
- migration or data backfill scripts
- test helpers
- project-level engineering checks tied to the codebase itself

Forbidden:

- AI workflow guard scripts
- rule-validation helpers that exist only to enforce AI document discipline
- scripts whose primary purpose is to validate `.ai-rules/` conventions

### 4.4 `.github/`

`.github/` is for repository collaboration surfaces used by humans and platform automation.

Allowed:

- general pull request templates
- issue templates
- workflow configuration
- repository-level collaboration defaults

Forbidden:

- AI-only execution templates
- phase execution templates that assume local AI planning workspaces
- templates that require ignored local artifacts such as `docs/` or `prd/`

### 4.5 `AGENTS.md`

`AGENTS.md` is an entrypoint for AI agents.

Allowed:

- reading order
- instruction priority
- pointers to canonical rule files
- concise project-level context needed before reading `.ai-rules/`

Forbidden:

- duplicating the full content of governance or architecture rules
- becoming a second rule manual

## 5. AI Governance Layer

### 5.1 `.ai-rules/`

`.ai-rules/` is the canonical home for AI governance and repository rule documents.

Use this directory for:

- governance rules
- architecture rules
- runtime/tooling rules
- commit rules
- testing rules
- AI workflow protocols
- AI guard scripts
- explanatory rule-adjacent material

### 5.2 `.ai-rules/guards/`

This directory contains rule-validation helpers for AI governance.

Rules:

1. Put AI workflow guard scripts here.
2. Run these scripts directly when needed.
3. Do not expose these scripts through `package.json`.
4. Keep these scripts focused on repository governance and rule compliance rather than application runtime behavior.

### 5.3 `.ai-rules/scripts/`

This directory contains AI governance execution scripts.

Rules:

1. Put AI workflow bootstrap/setup scripts here.
2. Use these scripts to standardize session entry, worktree setup, and baseline checks.
3. Do not place these scripts in root `scripts/`; governance scripts belong to `.ai-rules/scripts/`.
4. Do not expose these scripts through `package.json`.

## 6. Local AI Workspace Rules

### 6.1 `docs/` and `prd/`

In this repository, `docs/` and `prd/` are local AI workspaces.

They may contain:

- plans
- reports
- PRDs
- execution notes
- analysis artifacts

Rules:

1. Files under `docs/` and `prd/` are local working artifacts by default.
2. Files under these directories must not be staged or committed.
3. These directories must not be treated as canonical rule sources.
4. If a tracked file is found under these directories, remove it from the git index while preserving the local file.

### 6.2 Promotion Rule

If content from a local AI workspace becomes important enough to keep in version control, it must be promoted into an appropriate tracked project location outside `docs/` and `prd/`.

Do not force-add ignored files.

## 7. Promotion and Placement Rules

When deciding where a new file belongs, use this order:

1. Is it part of the software product or engineering runtime?
   - If yes, place it in the project layer.
2. Is it a repository governance rule or AI workflow helper?
   - If yes, place it under `.ai-rules/`.
3. Is it a local-only planning or analysis artifact?
   - If yes, place it under `docs/` or `prd/` and keep it untracked.

If a file does not clearly fit one of these categories, stop and decide the category before creating the file.

## 8. Detection Heuristics

Treat these as warning signs that a file is in the wrong place:

- a command exists in `package.json` but only helps AI follow rules
- a script in `scripts/` validates rule documents rather than project behavior
- a PR template references ignored local files
- `README.md` explains AI execution details
- `AGENTS.md` starts duplicating full rule bodies
- canonical implementation rules live outside `.ai-rules/`
- ignored local directories contain tracked files

When one of these conditions appears, refactor placement instead of normalizing the inconsistency.

## 9. Change Management Rules

When updating repository governance:

1. Prefer tightening boundaries over adding exceptions.
2. Prefer moving content to the correct layer over documenting why it is misplaced.
3. Prefer deleting obsolete templates, scripts, and references over leaving historical clutter.
4. Keep governance rules reusable across projects when possible.
5. Add project-specific exceptions only when they are materially justified.

## 10. Related Files

- `.ai-rules/README.md`
- `.ai-rules/project-tooling-and-runtime-rules.md`
- `.ai-rules/git-commit-rules.md`
- `.ai-rules/project-architecture-rules.md`
- `AGENTS.md`
