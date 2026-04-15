# Frontend Boundary Rules

## Overview

The frontend follows this dependency direction:

```
components -> hooks -> client/actions -> app server actions
```

## Layer Responsibilities

### Components (`components/`)

Allowed:
- JSX markup and styling
- props handling
- event handlers that delegate to hooks
- local UI state for purely presentational behavior

Prohibited:
- direct imports from `app/**/actions`
- state machine implementation
- server action orchestration
- business logic beyond UI rendering

### Hooks (`hooks/`)

Allowed:
- state management and state transitions
- async action orchestration
- business logic coordination
- integration with client action adapters

Prohibited:
- direct JSX rendering
- importing from `components/`

### Client Actions (`client/actions/`)

Allowed:
- thin wrappers around server actions
- type exports from server action types
- client-side feedback integration

Prohibited:
- business logic
- direct database access

### Client Feedback (`client/feedback/`)

Use this layer for toast notifications and other client-only feedback wrappers.

### Config (`config/`)

Use this layer for centralized frontend UI configuration such as navigation, filters, and display constants.

## Migration Pattern

1. Find direct imports from `app/**/actions` in components
2. Extract orchestration logic into `hooks/<domain>/`
3. Add client adapters in `client/actions/`
4. Update components to depend on hooks instead of actions
5. Remove transitional re-exports after migration

## Validation Commands

```bash
rg -n "from '@/app/.*/actions'" components
rg -n "export.*workspaceNavItems|export.*filterTabs" components
```

## References

- `.ai-rules/project-architecture-rules.md`
- `.ai-rules/react-client-state-and-forms-rules.md`
