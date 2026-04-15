# Phase Execution Protocol

> This document defines the mandatory execution protocol for all phase plans. AI agents must follow this protocol without exception.

## 1. Scope

This protocol applies to all phase plans in `docs/superpowers/plans/` and any feature/hotfix work following the phase model.

`docs/superpowers/plans/` is an ignored local AI workspace. Phase plans and generated artifacts in this directory are execution aids and must not be staged or committed.

## 2. Phase Plan Metadata

Every phase plan document MUST include:

```yaml
phase_id: <unique-phase-identifier>
depends_on: [<phase-id>, ...]  # or [] if no dependencies
parallel_safe: true|false
base_branch_rule: Must start from latest main
branch_naming_rule: feat/${phase_id}
worktree_naming_rule: .worktrees/${phase_id}
failure_report_path: docs/superpowers/plans/artifacts/${phase_id}-failure-report.md
merge_strategy: PR-only
artifact_dir: docs/superpowers/plans/artifacts
verification_report_path: docs/superpowers/plans/artifacts/${phase_id}.verification-report.md
```

## 2.1 Reporting Contract (Mandatory)

All phase execution artifacts MUST be written under:

`docs/superpowers/plans/artifacts/`

Naming rule:
- Use `${phase_id}` as the filename prefix (same semantic identity as branch/worktree).
- Avoid ambiguous generic names like `phaseX-verification-report.md` for new plans.

Minimum artifact set for each phase:
- `${phase_id}-failure-report.md`
- `${phase_id}.verification-report.md`

Optional artifacts (as needed by phase scope):
- `${phase_id}.coverage-gap-report.md`
- `${phase_id}.performance-regression-report.md`
- `${phase_id}.boundary-audit-report.md`
- `${phase_id}.release-readiness-report.md`
- `${phase_id}.final-refactor-summary.md`

## 2.2 Protocol Guard

The phase document protocol guard lives with the rule files, not in project runtime scripts:

```bash
bash .ai-rules/guards/check-phase-doc-protocol.sh
```

Use it when creating or reviewing a phase plan document. Do not add this guard to `package.json`; it validates AI workflow documents, not application code.

## 3. Execution Gates

All phase plans must pass these gates in order:

### 3.1 Preflight Gate (Before Starting)

**Purpose**: Verify all dependencies are satisfied.

```bash
git fetch --all --prune
git checkout main && git pull --ff-only
# Check dependency exists:
git show-ref --verify --quiet refs/remotes/origin/feat/${depends_on}
git merge-base --is-ancestor origin/${depends_on} origin/main
```

**Fail-Fast**: If dependency check fails, STOP immediately.

### 3.1.1 Dependency Failure Handling (Required)

If Preflight dependency check fails:
1. Stop all remaining tasks immediately
2. Generate `${phase_id}-failure-report.md`
3. Wait for explicit user confirmation before any resume

This is an execution-precondition failure, not a runtime test failure.

### 3.2 Start Gate (Before Development)

**Purpose**: Verify isolated workspace is set up correctly.

```bash
git branch --show-current  # Should be feat/${phase_id}
git merge-base --is-ancestor origin/main HEAD && echo "base-ok"
```

**Fail-Fast**: If baseline check fails, STOP immediately.

### 3.3 Sync Gate (Before Merge)

**Purpose**: Ensure branch is rebased on latest main.

```bash
git fetch --all --prune
git rebase origin/main
pnpm lint
bash .ai-rules/guards/check-import-boundaries.sh
```

**Fail-Fast**: If any check fails, STOP immediately.

### 3.4 PR Merge Gate

```bash
gh pr create --base main --head feat/${phase_id}
gh pr merge --squash --auto
```

**Required**: PR-only merge (no direct merge to main).

## 4. Fail-Fast Rule

Applies to all gates. On failure:
1. Stop all execution immediately
2. Generate failure report at `${failure_report_path}`
3. Wait for user confirmation before resuming

## 4.1 Task 0 Requirement (Bootstrap)

Each phase plan SHOULD include `Task 0`:
- Create failure-report template
- Run Preflight dependency check
- Continue only when Preflight passes

Reason: ensures failure logging and stop behavior are standardized before implementation begins.

## 5. Worktree Setup

```bash
git fetch --all --prune
git checkout main && git pull --ff-only
git worktree add .worktrees/${phase_id} -b feat/${phase_id}
cd .worktrees/${phase_id}
```

## 6. Parallel Execution

| Flag | Meaning |
|------|---------|
| `parallel_safe: true` | Can run concurrently with other phases |
| `parallel_safe: false` | Must run alone; waits for dependencies |

## 7. Related Rules

- Layered architecture boundaries: `.ai-rules/project-architecture-rules.md`
- Testing and verification decision rules: `.ai-rules/testing-and-integration-rules.md`
- Repository asset and local workspace governance: `.ai-rules/project-governance-rules.md`
