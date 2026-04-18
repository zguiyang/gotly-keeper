# Phase Task Report: ${phase_id}

```yaml
phase_id: ${phase_id}
execution_id: ${execution_id}
generated_at: ${timestamp}
branch_type: ${branch_type}
branch: ${branch_type}/${phase_id}
worktree: .worktrees/${phase_id}
merge_strategy: local-first-pr-fallback
```

## Execution Summary

- Result: `${result}` (`SUCCESS` | `PARTIAL` | `FAILED`)
- Owner: `${owner}`
- Scope: `${scope_summary}`

## Gate Status

| Gate | Status | Details |
|------|--------|---------|
| Preflight Gate | `${status}` | `${details}` |
| Start Gate | `${status}` | `${details}` |
| Sync Gate | `${status}` | `${details}` |
| Code Review Gate | `${status}` | `${details}` |
| Local Merge Gate | `${status}` | `${details}` |
| PR Fallback Consent Gate | `${status}` | `${details}` |
| GitHub CLI Auth Gate | `${status}` | `${details}` |
| PR Fallback Creation Gate | `${status}` | `${details}` |
| PR Review and Status Gate | `${status}` | `${details}` |
| PR Fallback Merge Gate | `${status}` | `${details}` |

## PR and Merge Record

- PR URL: `${pr_url}`
- GitHub CLI auth verified: `${yes_or_no}`
- Code review result: `${passed_or_failed_or_skipped}`
- Local merge attempted: `${yes_or_no}`
- Local merge result: `${success_or_fail_or_skipped}`
- PR fallback approved by user: `${yes_or_no_or_not_needed}`
- PR review/status result: `${passed_or_failed_or_skipped}`
- Fallback PR merge attempted: `${yes_or_no}`
- Fallback PR merge result: `${success_or_fail_or_skipped}`
- Final integration status (`main`): `${merged_or_not_merged}`

## Verification Record

- Commands run: `${verification_commands}`
- Outcome: `${verification_summary}`
- Verification report (optional): `${verification_report_path_or_none}`

## Failure Linkage

- Failure report path: `${failure_report_path_or_none}`
- User notified on failure: `${yes_or_no}`

## Notes for Audit

- `${audit_note_1}`
- `${audit_note_2}`
