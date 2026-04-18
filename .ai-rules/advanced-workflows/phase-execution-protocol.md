# Phase Execution Protocol

> This document defines the mandatory execution protocol for all phase plans. AI agents must follow this protocol without exception.

## 1. Scope

This protocol applies to all phase plans in `docs/superpowers/plans/` and any feature/hotfix work following the phase model.

`docs/superpowers/plans/` is an ignored local AI workspace. Phase plans and generated artifacts in this directory are execution aids and must not be staged or committed.

Plan writing requirement:
- Write phase plans from a novice-AI perspective (zero hidden context), using explicit, step-by-step, unambiguous instructions so execution does not depend on implicit assumptions.

## 2. Phase Plan Metadata

Every phase plan document MUST include:

```yaml
phase_id: <unique-phase-identifier>
depends_on: [<phase-id>, ...]  # or [] if no dependencies
parallel_safe: true|false
base_branch_rule: Must start from latest main
branch_type: feat|fix|refactor|ui|chore
branch_naming_rule: ${branch_type}/${phase_id}
worktree_naming_rule: .worktrees/${phase_id}
task_report_path: docs/superpowers/plans/artifacts/${phase_id}.task-report.md
failure_report_path: docs/superpowers/plans/artifacts/${phase_id}-failure-report.md
merge_strategy: local-first-pr-fallback
pr_submission_rule: Create PR only after local merge fails and user explicitly approves PR fallback
task_report_template: .ai-rules/advanced-workflows/templates/phase-task-report.template.md
failure_report_template: .ai-rules/advanced-workflows/templates/phase-failure-report.template.md
artifact_dir: docs/superpowers/plans/artifacts
verification_report_path: docs/superpowers/plans/artifacts/${phase_id}.verification-report.md
code_review_rule: Must pass code review before merge or PR fallback
gh_auth_rule: Must verify `gh auth status` before any `gh pr` command
```

## 2.1 Reporting Contract (Mandatory)

All phase execution artifacts MUST be written under:

`docs/superpowers/plans/artifacts/`

Naming rule:
- Use `${phase_id}` as the filename prefix (same semantic identity as branch/worktree).
- Avoid ambiguous generic names like `phaseX-verification-report.md` for new plans.

Mandatory artifact for each execution (success/failure):
- `${phase_id}.task-report.md`

Failure artifact (required when any gate/merge/verification step fails):
- `${phase_id}-failure-report.md`

Verification artifact (recommended, phase-specific):
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
bash .ai-rules/advanced-workflows/guards/check-phase-doc-protocol.sh
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
git branch --show-current  # Should be ${branch_type}/${phase_id}
git merge-base --is-ancestor origin/main HEAD && echo "base-ok"
bash .ai-rules/advanced-workflows/scripts/ai-bootstrap-check.sh
```

**Fail-Fast**: If baseline check fails, STOP immediately.

### 3.3 Sync Gate (Before Merge)

**Purpose**: Ensure branch is rebased on latest main.

```bash
git fetch --all --prune
git rebase origin/main
pnpm lint
bash .ai-rules/advanced-workflows/guards/check-import-boundaries.sh
bash .ai-rules/advanced-workflows/guards/check-phase-artifact-sync.sh --phase-id ${phase_id}
```

**Fail-Fast**: If any check fails, STOP immediately.

### 3.4 Code Review Gate (Before Merge or PR Fallback)

**Purpose**: Prevent merging or creating fallback PRs for code that has not passed review.

Minimum review requirements:

1. Review the full diff and related code in a code-review stance.
2. Record whether blocking findings exist.
3. If any blocking correctness, architecture, security, data-loss, or test-coverage issue exists, STOP immediately.
4. Notify the user with the blocking findings and do not merge locally, create a PR, or use PR fallback merge until the issues are fixed and review is rerun.

For PR-based integration, external review requirements still apply. A local AI review does not override missing required human approval, failed GitHub review rules, or failed status checks.

**Fail-Fast**: If review fails or review status is unknown, STOP immediately and notify the user.

### 3.5 Local Merge Gate (Primary)

```bash
git fetch --all --prune
git checkout main && git pull --ff-only
git merge --no-ff ${branch_type}/${phase_id}
git push origin main
```

**Primary path**: Always try local merge first after Sync Gate and Code Review Gate pass.

**Fail-Fast**: If local merge or push fails, STOP immediately, notify the user with the exact failure, and ask whether to create a PR for fallback merge. Do not create a PR unless the user explicitly approves PR fallback.

### 3.6 PR Fallback Consent Gate (Only When Local Merge Fails)

Ask the user whether to create a PR for fallback merge.

Rules:

1. State that local merge failed.
2. Summarize the merge/push failure.
3. Ask for explicit approval before any PR operation.
4. If the user does not approve PR fallback, stop and leave the branch/worktree intact.

### 3.7 GitHub CLI Auth Gate (Before any `gh pr` Command)

**Purpose**: Detect expired or missing GitHub CLI credentials before PR operations.

```bash
gh auth status
```

**Fail-Fast**: If `gh auth status` fails, STOP immediately, notify the user that GitHub CLI authentication is unavailable, and ask the user to restore authentication with `gh auth login` or another approved auth path. Do not attempt `gh pr create`, `gh pr merge`, or other GitHub PR operations while auth is failed or unknown.

### 3.8 PR Fallback Creation Gate

```bash
gh pr create --base main --head ${branch_type}/${phase_id}
```

**Required only when**: Local Merge Gate failed and the user explicitly approved PR fallback.

### 3.9 PR Review and Status Gate (Before PR Fallback Merge)

**Purpose**: Ensure the PR is actually mergeable before either local merge or PR merge.

Before merging, verify the PR review/check state using GitHub CLI or the GitHub UI.

Minimum CLI check:

```bash
gh pr view --json reviewDecision,mergeStateStatus,statusCheckRollup
```

Rules:

1. If required reviews are pending, changes are requested, checks are failing, or mergeability is blocked, STOP immediately.
2. Notify the user with the exact blocking reason.
3. If the repository has no required PR review/check policy, ask the user for explicit approval before PR fallback merge.

### 3.10 PR Fallback Merge Gate (When Local Merge Fails and User Approved)

```bash
gh pr merge --squash --auto
```

If local merge fails and the user approved PR fallback, merge through PR.
If PR merge also fails, STOP immediately and notify user.

## 4. Fail-Fast Rule

Applies to all gates. On failure:
1. Stop all execution immediately
2. Generate failure report at `${failure_report_path}`
3. Wait for user confirmation before resuming
4. Record user-facing failure notice in `${phase_id}.task-report.md`

## 4.1 Task 0 Requirement (Bootstrap)

Each phase plan SHOULD include `Task 0`:
- Decide `branch_type` from scope (`feat|fix|refactor|ui|chore`)
- Create phase task-report from `.ai-rules/advanced-workflows/templates/phase-task-report.template.md`
- Prepare failure-report from `.ai-rules/advanced-workflows/templates/phase-failure-report.template.md`
- Run Preflight dependency check
- Continue only when Preflight passes

Reason: ensures task reporting, failure logging, and stop behavior are standardized before implementation begins.

## 5. Worktree Setup

```bash
bash .ai-rules/advanced-workflows/scripts/create-ai-worktree.sh ${phase_id} ${branch_type}
cd .worktrees/${phase_id}
bash .ai-rules/advanced-workflows/scripts/ai-bootstrap-check.sh --worktree . --strict
```

## 5.1 Artifact Sync Rule (Worktree → Primary Workspace)

In worktree mode, phase reports are still required but remain local-only artifacts.

To avoid report divergence across multiple worktrees:

1. Write phase artifacts in the current worktree at `docs/superpowers/plans/artifacts/`.
2. Before handoff, gate transition, or session end, sync artifacts to the primary workspace path with:

```bash
bash .ai-rules/advanced-workflows/scripts/sync-phase-artifacts.sh --phase-id ${phase_id}
```

3. Never stage or commit synced artifacts under `docs/`.

This keeps audit artifacts discoverable in one local place while preserving workspace-exclusion rules.

## 6. Parallel Execution

| Flag | Meaning |
|------|---------|
| `parallel_safe: true` | Can run concurrently with other phases |
| `parallel_safe: false` | Must run alone; waits for dependencies |

## 7. Related Rules

- Layered architecture boundaries: `.ai-rules/core/project-architecture-rules.md`
- Testing and verification decision rules: `.ai-rules/core/testing-and-integration-rules.md`
- Repository asset and local workspace governance: `.ai-rules/core/project-governance-rules.md`

## 8. Compatibility Note

Existing completed historical phase plans may still use `merge_strategy: PR-only`.
Do not retroactively edit historical completed plans just to match this protocol version.
For all new plans and reruns, use this document as the required standard.
