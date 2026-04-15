# Phase Execution Lessons Learned

This file is explanatory, not normative.

Use it to understand why the protocol in `.ai-rules/phase-execution-protocol.md` exists.

## Main Failure Mode

Parallel feature phases can finish implementation work and still fail integration when they start from stale baselines or assume a dependency phase has already merged.

Typical pattern:

- Phase A changes shared architecture or boundaries
- Phase B assumes those changes already exist
- Phase B starts from outdated `main`
- Phase B completes local work but fails during rebase or merge

## What Prevents It

Use hard gates, not soft reminders:

1. Preflight dependency gate before implementation
2. Start gate to verify branch baseline
3. Sync gate before merge
4. PR-only merge
5. Fail-fast on any gate failure

## Artifact Discipline

Keep branch, worktree, and report identity aligned:

- branch: `feat/${phase_id}`
- worktree: `.worktrees/${phase_id}`
- report prefix: `${phase_id}`

Artifact directory remains:

- `docs/superpowers/plans/artifacts/`

Minimum artifacts:

- `${phase_id}-failure-report.md`
- `${phase_id}.verification-report.md`

## Source of Truth

Normative files:

- `.ai-rules/phase-execution-protocol.md`
- `.ai-rules/project-architecture-rules.md`
