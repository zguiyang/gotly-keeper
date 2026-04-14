# Phase 7 Docs & Rules Hardening - Diff Summary

## Summary

Phase 7 consolidates architecture rules, execution protocols, and introduces guard scripts for automated validation.

## Files Changed

### New Files Created

| File | Purpose |
|------|---------|
| `docs/architecture/README.md` | Architecture documentation index |
| `docs/architecture/phase-execution-protocol.md` | Phase execution protocol reference |
| `.github/pull_request_template.md` | Standard PR template |
| `.github/PULL_REQUEST_TEMPLATE/phase-execution.md` | Phase execution PR template |
| `.github/PULL_REQUEST_TEMPLATE/phase-hotfix.md` | Hotfix PR template |
| `scripts/guards/check-phase-doc-protocol.sh` | Phase plan validation script |
| `scripts/guards/check-import-boundaries.sh` | Architecture boundary check script |

### Modified Files

| File | Changes |
|------|---------|
| `.ai-rules/nextjs-fullstack-project-rules.md` | Added Section 9: Layered Architecture Boundary Rules and Phase Execution Protocol requirements |
| `.ai-rules/nextjs-runtime-and-boundaries-rules.md` | Added Section 8: Phase Execution Protocol Reference |
| `.ai-rules/testing-and-integration-rules.md` | Added Section 12.6: Test Minimum Contract requirements |
| `.ai-rules/project-tooling-and-runtime-rules.md` | Added Section 11: Phase Execution Protocol Reference |
| `docs/architecture-boundary-checklist.md` | Added Phase Execution Protocol section with parallel execution and conflict handling rules |
| `AGENTS.md` | Added Phase Execution Protocol section |
| `README.md` | Added Phase Execution Protocol section |
| `package.json` | Added `guard:phase-doc`, `guard:boundaries`, `guard:all` npm scripts |

### Artifacts Created

| File | Purpose |
|------|---------|
| `docs/superpowers/plans/artifacts/phase7-docs-rules-hardening-failure-report.md` | Failure report template |

## Architecture Impact

### Layered Boundary Rules Added

```
app/actions -> application -> domain -> infra
```

- Enforced unidirectional dependency
- Forbidden reverse dependencies
- Clear layer definitions and import rules

### Phase Execution Protocol

All phase plans must now include:
- `phase_id`
- `depends_on`
- `parallel_safe`
- Preflight Gate, Start Gate, Sync Gate, Fail-Fast
- PR-only merge strategy

### Test Minimum Contract

New features must include minimum tests based on layers touched:
- Domain only: 1 domain unit test
- Application: +1 application integration test
- App/actions: +1 action contract test
- Infra: +1 integration test with real infra

## Guard Scripts

### Phase Doc Protocol Guard
- Validates phase plans contain required fields
- Checks for `phase_id`, `depends_on`, `parallel_safe`
- Validates presence of execution gates

### Import Boundaries Guard
- Checks for reverse dependencies
- Prevents `server/**` from importing `app/**`
- Validates architecture layer separation
