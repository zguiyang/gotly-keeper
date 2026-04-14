# Phase Execution PR Template

## Phase Information

- **phase_id**: 
- **depends_on**: 
- **parallel_safe**: `true` | `false`

## Execution Verification

### Preflight Gate
```
Command: git show-ref --verify --quiet refs/remotes/origin/feat/<depends_on>
Result: PASS | FAIL
```

### Start Gate
```
Branch: feat/<phase_id>
Baseline check: PASS | FAIL
```

### Sync Gate
```
Rebase on origin/main: PASS | FAIL
pnpm lint: PASS | FAIL (0 errors, N warnings)
guard:all: PASS | FAIL
```

## Changes Summary

<!-- Bullet list of files changed and why -->

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| ... | ... | ... |

## Rollback Plan

<!-- How to rollback if this PR causes issues -->

## Exit Criteria Status

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Related Documents

- Phase plan: `docs/superpowers/plans/<phase-plan-file>.md`
- Verification report: `docs/superpowers/plans/artifacts/<phase>-verification-report.md`

## Handoff Notes

<!-- Any notes for the next agent or developer -->
