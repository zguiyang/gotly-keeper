# Action and Application Layer Boundary Rules

## Purpose

This document defines the responsibilities and boundaries between:
- **Server Actions** (`app/**/actions.ts`) - thin entry points
- **Application Use-Cases** (`server/application/<domain>/`) - orchestration layer

## Architecture Overview

```
app/**/actions.ts -> server/application/<domain>/*.use-case.ts -> server/<domain>/*.service.ts
```

## Action Entry Responsibilities

Server Actions should only contain:

1. **Input validation**
   - type checks
   - format validation
   - validation helper delegation
2. **Authentication**
   - `requireUser()` or equivalent session check
3. **Action wrapper**
   - `runServerAction()` for logging and tracing
4. **Cache invalidation**
   - `revalidatePath()` calls
5. **Use-case delegation**
   - call use-cases and return results

### Action Layer Must Not

- call domain services directly
- contain business logic branching
- call `revalidatePath()` from use-cases
- import from `@/app`

## Application Use-Case Responsibilities

Use-cases handle orchestration:

1. business logic branching
2. cross-domain coordination
3. error handling and translation

### Use-Case Must Not

- call `revalidatePath()` or other Next.js runtime APIs
- import from `@/app`
- contain UI rendering logic
- access request/session context directly

## Naming Conventions

```
server/application/<domain>/
  <action>.use-case.ts
  <domain>.types.ts
  index.ts
```

Use input names like `<ActionName>Input` and use-case functions like `<actionName>UseCase`.

## Type Placement

- Reuse types from `shared/` for cross-runtime contracts
- Define use-case input/output types in `server/application/<domain>/<domain>.types.ts`
- Avoid duplicating domain service types in the use-case layer

## Error Handling

- Use-cases should throw `ActionError` with domain-appropriate codes
- Actions should preserve the existing return shape and error semantics

## Migration Checklist

- Identify business logic branching in the action
- Create or update the use-case file in `server/application/<domain>/`
- Move branching logic to the use-case
- Keep input validation in the action
- Keep authentication in the action
- Keep cache invalidation in the action
- Keep the action wrapper in the action
- Verify dependency direction stays correct

## Testing Strategy

- Unit test use-cases with mocked domain services
- Integration test actions through the full action -> use-case -> service flow

## References

- `.ai-rules/project-architecture-rules.md`
