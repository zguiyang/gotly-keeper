# Phase Failure Report: ${phase_id}

```yaml
phase_id: ${phase_id}
execution_id: ${execution_id}
generated_at: ${timestamp}
branch_type: ${branch_type}
failed_step: ${failed_step}
```

## Failure Summary

- Gate/Step: `${failed_step}`
- Severity: `${severity}`
- Blocking status: `${blocking_status}`

## Error Details

```text
${error_output}
```

## Context

- Branch: `${branch_type}/${phase_id}`
- Worktree: `.worktrees/${phase_id}`
- Current commit: `${commit_sha}`
- Working tree: `${git_status_summary}`

## Root Cause

`${root_cause_analysis}`

## Actions Taken

- `${action_1}`
- `${action_2}`

## Resume Preconditions

- `${precondition_1}`
- `${precondition_2}`
- Explicit user confirmation required before resume.

## User Notification

- User notification sent: `${yes_or_no}`
- Notification content summary: `${notification_summary}`
