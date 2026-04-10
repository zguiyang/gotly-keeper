# React Client State and Forms Rules

## 1. Scope

These rules define how AI agents should use client-side React hooks, form state, and validation libraries in this repository.

Use this file when the task touches:

- interactive Client Components
- local UI state and side effects
- non-trivial forms
- shared validation schemas
- `ahooks`
- `@tanstack/react-form`
- `zod`

## 2. Dependency Baseline

The current repository includes these app dependencies:

- `@tanstack/react-form`
- `ahooks`
- `zod`

Rules:

1. Treat these libraries as approved options for implementation.
2. Do not introduce additional overlapping libraries unless the task requires a capability the current stack cannot cover.
3. Before using an integration helper from a companion package, verify it is installed in `package.json`.
4. Do not generate code that imports packages that are not currently installed unless the same change explicitly adds them.

Current reminder:

- `@tanstack/zod-form-adapter` is not currently listed in `package.json`, so do not assume adapter-based Zod integration is available by default.

## 3. Client and Server Boundary Rule

These libraries are not interchangeable across Next.js boundaries.

Rules:

1. `ahooks` and `@tanstack/react-form` are Client Component tools. Use them only in files that intentionally run on the client.
2. Do not pull `ahooks` or `@tanstack/react-form` into Server Components, route handlers, or server-only modules.
3. `zod` may be used on both server and client, but validation logic must still respect data sensitivity and runtime boundaries.
4. If a form submits privileged or persistent data, validate again on the server even when client-side validation exists.

## 4. Ahooks Usage Rules

Use `ahooks` when it materially improves interactive client code.

Good fits:

- debouncing and throttling user-driven actions
- event listeners and browser API wiring
- timers, intervals, and mount/unmount helpers
- localized async state inside Client Components

Rules:

1. Prefer built-in React and Next.js primitives when they already express the behavior clearly.
2. Reach for `ahooks` when it reduces boilerplate or removes error-prone effect code in a Client Component.
3. Do not use `ahooks` as the default data-fetching layer for server-rendered page data.
4. Do not use client-side hooks to replace direct server-side data access for initial page rendering.

## 5. TanStack Form Rules

Use `@tanstack/react-form` for non-trivial client-side forms that benefit from headless composition and strong TypeScript inference.

Good fits:

- forms with multiple fields or nested fields
- controlled UI library inputs
- dynamic field arrays
- validation and error-state handling
- forms where render performance matters

Rules:

1. Prefer `@tanstack/react-form` over ad hoc `useState` form state once a form becomes non-trivial and field-level subscriptions or typed validators matter.
2. Always provide stable `defaultValues` for form state initialization.
3. Keep form rendering concerns in components and push submit-side business logic to server actions, route handlers, or domain services as appropriate.
4. Do not put domain validation rules only in client form code when the server also depends on them.
5. Prefer field-level subscriptions and localized state reads over broad top-level subscriptions that rerender the whole form.

## 6. Zod Schema Rules

Use `zod` as the default schema and validation library when typed runtime validation is needed.

Rules:

1. Prefer one shared schema source per data contract instead of duplicating validation logic across client and server.
2. Put domain-specific schemas near the relevant module or feature instead of scattering them across route files.
3. Put reusable cross-domain schemas in `shared/` or other clearly shared locations.
4. Keep route files, page files, and UI components thin by importing schemas instead of defining large schemas inline.
5. When parsing request data or external input, validate at the boundary before passing data deeper into the system.

Preferred naming:

- `*.schema.ts` for validation schemas
- `*.types.ts` only when the file exists primarily for shared type declarations

## 7. Placement and Composition Rules

When adding new code related to these libraries:

1. Keep route entries and `app/` files focused on orchestration.
2. Keep reusable form UI in `components/`.
3. Keep domain submission logic and persistence orchestration in `server/`.
4. Keep shared validators and cross-domain parsing helpers in `shared/` or domain-local schema files.
5. Do not let Client Components become the only place where business rules are enforced.

## 8. AI Implementation Checklist

Before generating code that uses these libraries:

1. Confirm whether the file must be a Client Component.
2. Confirm whether the data contract also needs server-side validation.
3. Confirm whether the schema belongs in a domain-local file or a shared schema file.
4. Confirm whether the required package is already installed.
5. Read the matching local skill before implementation:
   - `ahooks`
   - `tanstack-form`
   - `zod`
