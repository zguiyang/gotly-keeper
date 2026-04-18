# Phase XX - <Short Title>

```yaml
phase_id: <unique-phase-id>
depends_on: []  # or [phase-a, phase-b]
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

## Required Skill（强制）

- 使用 `using-git-worktrees` 技能创建隔离工作区。

## Write Set（仅限）

- Modify: `<allowed-file-1>`
- Create: `<allowed-file-2>`
- 禁止修改未声明文件。

## 执行清单

- [ ] Task 0: 基于模板创建 `${phase_id}.task-report.md` 与 `${phase_id}-failure-report.md`，并执行 Preflight Gate。
- [ ] Task 0.1: 根据任务类型选择 `branch_type`（`feat|fix|refactor|ui|chore`）。
- [ ] 创建工作树 `.worktrees/${phase_id}` 与分支 `${branch_type}/${phase_id}`。
- [ ] 完成 Write Set 内实现。
- [ ] 执行验证命令并记录结果。
- [ ] 执行 Code Review Gate；若存在阻塞问题，停止并告知用户。
- [ ] 本地优先 merge 回 `main`。
- [ ] 若本地 merge 或 push 失败，立即停止并告知用户失败原因，询问是否创建 PR 作为 fallback。
- [ ] 仅在用户明确同意 PR fallback 后，执行 GitHub CLI Auth Gate：`gh auth status` 必须通过，否则停止并提醒用户重新登录。
- [ ] 仅在用户明确同意 PR fallback 后，创建 PR 并执行 PR Review and Status Gate；未通过审查、检查失败或状态未知时停止并告知用户。
- [ ] PR fallback merge 若失败，停止并告知用户。
- [ ] 更新 `${phase_id}.task-report.md`（成功/失败都必须写）。

## Start Gate

- `git branch --show-current` 必须是 `${branch_type}/${phase_id}`
- `git merge-base --is-ancestor origin/main HEAD && echo "base-ok"`

## Sync Gate

- `git fetch --all --prune`
- `git rebase origin/main`
- `pnpm lint`
- `bash .ai-rules/advanced-workflows/guards/check-import-boundaries.sh`

## Local Merge Gate（主路径）

- `git checkout main && git pull --ff-only`
- `git merge --no-ff ${branch_type}/${phase_id}`
- `git push origin main`
- 失败时立即停止，告知用户失败原因，并询问是否创建 PR 作为 fallback。

## PR Fallback Consent Gate（仅本地 merge 失败后）

- 用户明确同意 PR fallback 前，不允许执行 `gh pr create` 或 `gh pr merge`。

## PR Fallback Creation Gate（仅用户同意后）

- `gh auth status`
- `gh pr create --base main --head ${branch_type}/${phase_id}`

## PR Review and Status Gate（merge 前必须）

- `gh pr view --json reviewDecision,mergeStateStatus,statusCheckRollup`
- 未通过审查、检查失败、mergeability blocked、或状态未知：立即停止并告知用户。

## PR Fallback Merge Gate（兜底）

- `gh pr merge --squash --auto`

## Fail-Fast

- 任一 Gate / 验证 / merge 失败：立即停止。
- 立即更新 `${phase_id}-failure-report.md` 与 `${phase_id}.task-report.md`。
- 明确告知用户失败点与阻塞原因，等待用户确认后再继续。
