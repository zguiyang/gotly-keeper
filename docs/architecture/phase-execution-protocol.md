# Phase Execution Protocol

## Overview

This document describes the standardized execution protocol for all phase plans in the Gotly AI project. All phase plans MUST follow this protocol.

## Phase Plan Metadata

Every phase plan document MUST include:

```yaml
phase_id: <unique-phase-identifier>
depends_on: [<phase-id>, ...]  # or [] if no dependencies
parallel_safe: true|false
base_branch_rule: Must start from latest main (already merged Phase N)
branch_naming_rule: feat/${phase_id}
worktree_naming_rule: .worktrees/${phase_id}
failure_report_path: docs/superpowers/plans/artifacts/${phase_id}-failure-report.md
merge_strategy: PR-only  # Required - no direct merge to main
```

## Execution Gates

All phase plans must pass these gates in order:

### 1. Preflight Gate (Before Starting)

**Purpose**: Verify all dependencies are satisfied before beginning work.

**Commands**:
```bash
git fetch --all --prune
git checkout main && git pull --ff-only
# Check dependency exists and is merged:
git show-ref --verify --quiet refs/remotes/origin/feat/${depends_on_branch}
git merge-base --is-ancestor origin/${depends_on_branch} origin/main
# OR check via verification report if branch was deleted
```

**Expected**: Dependency commits exist in `origin/main`.

**Fail-Fast**: If dependency check fails, STOP immediately and generate failure report.

### 2. Start Gate (Before Development)

**Purpose**: Verify isolated workspace is set up correctly.

**Commands**:
```bash
git branch --show-current  # Should be feat/${phase_id}
git merge-base --is-ancestor origin/main HEAD && echo "base-ok"
```

**Expected**: 
- Current branch is `feat/${phase_id}`
- Branch baseline includes `origin/main`

**Fail-Fast**: If baseline check fails, STOP immediately.

### 3. Sync Gate (Before Merge)

**Purpose**: Ensure branch is rebased on latest main before merging.

**Commands**:
```bash
git fetch --all --prune
git rebase origin/main
pnpm lint
pnpm run guard:all  # If guard scripts exist
```

**Expected**: Rebase succeeds, lint passes, guard checks pass.

**Fail-Fast**: If any check fails, STOP immediately.

### 4. PR Merge Gate

**Purpose**: Merge via PR for review and traceability.

**Commands**:
```bash
git push -u origin feat/${phase_id}
gh pr create --base main --head feat/${phase_id} --title "phaseN: <description>" --body-file <body-file>
gh pr merge --squash --auto
```

**Expected**: PR created, reviewed (if required), and merged to `main`.

**Fail-Fast**: If PR creation/merge fails, STOP immediately.

## Fail-Fast Rule

**Applies to**: All gates (Preflight, Start, Sync, PR Merge)

**Behavior on failure**:
1. Immediately stop all further execution
2. Generate failure report at `docs/superpowers/plans/artifacts/${phase_id}-failure-report.md`
3. Do NOT attempt to continue or bypass the failure
4. Wait for user confirmation before resuming

## Worktree Setup

All phase work SHOULD be done in an isolated worktree:

```bash
git fetch --all --prune
git checkout main && git pull --ff-only
git worktree add .worktrees/${phase_id} -b feat/${phase_id}
cd .worktrees/${phase_id}
```

**Benefits**:
- Isolates phase work from other concurrent work
- Allows parallel execution of non-dependent phases
- Keeps main branch clean

## Branch Naming

| Purpose | Pattern |
|---------|---------|
| Feature branch | `feat/${phase_id}` |
| Bugfix branch | `fix/${phase_id}` |
| Hotfix branch | `hotfix/${phase_id}` |

## Parallel Execution

- `parallel_safe: true` - Phase can run concurrently with other phases
- `parallel_safe: false` - Phase must run alone (waits for dependencies, holds exclusive access)

## Handoff Protocol

When handing off to another agent or session:

1. Commit all work with clear messages
2. Push branch to origin
3. Update phase verification report with current status
4. Document any blockers or pending decisions

## Related Documents

- `.ai-rules/nextjs-fullstack-project-rules.md` - Architecture rules and protocol
- `.ai-rules/testing-and-integration-rules.md` - Test execution protocol
- `docs/architecture/README.md` - Architecture documentation index
- `docs/superpowers/plans/` - Phase plan documents
