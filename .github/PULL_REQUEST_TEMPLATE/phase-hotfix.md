# Hotfix PR Template

## Hotfix Information

- **phase_id**: 
- **hotfix_type**: `bugfix` | `security` | `regression` | `other`

## Protocol Bypass

- [ ] This hotfix bypasses normal phase protocol
- [ ] Justification for bypass: 

## Changes Summary

<!-- Bullet list of changes made -->

## Testing

```
pnpm lint: PASS | FAIL
pnpm test: PASS | FAIL
```

## Compensation Actions

<!-- What needs to be done to bring main back into compliance with phase protocol after this hotfix? -->

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| ... | ... | ... |

## Related Issues

<!-- Fixes #issue-number -->

## Approvals

- [ ] User approval obtained for protocol bypass
