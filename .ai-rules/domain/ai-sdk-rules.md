# AI SDK Rules

## 1. Scope

Use this file when work touches:

- `ai`
- `@ai-sdk/react`
- AI Gateway configuration
- model calls, agents, tools, embeddings, reranking, or streaming chat
- `app/api/**/route.ts` handlers that exist to serve AI SDK client transports

These rules define repository-specific boundaries for AI SDK usage. They do not replace the official AI SDK docs bundled with the installed package.

## 2. Documentation Source Rule

Before writing or changing AI SDK code:

1. Read the local `ai-sdk` skill.
2. Read the installed AI SDK docs in `node_modules/ai/docs/`.
3. Read installed package types or source when the API surface is still unclear.
4. Prefer installed docs and types over memory because AI SDK APIs are version-sensitive.

## 3. Dependency Baseline

The repository currently includes:

- `ai`
- `@ai-sdk/react`
- `@ai-sdk/alibaba`
- `@ai-sdk/openai-compatible`
- `zod`

Rules:

1. Use `ai` for server-side AI SDK core operations such as `generateText`, `streamText`, agents, tools, Gateway provider access, and response helpers.
2. Use `@ai-sdk/react` only in intentional Client Components for AI SDK UI hooks such as `useChat`, `useCompletion`, and `experimental_useObject`.
3. Prefer already-installed provider packages before adding new provider dependencies.
4. Do not add more provider-specific packages unless the same change requires them and updates `package.json`.
5. Do not assume optional AI SDK companion packages such as `@ai-sdk/devtools` are installed. Verify `package.json` before importing them.

## 4. Environment Rule

Current AI Gateway-related environment fields:

- `AI_GATEWAY_API_KEY`
- `AI_GATEWAY_URL`

Rules:

1. Treat both variables as server-only configuration.
2. Do not expose either variable through `NEXT_PUBLIC_*`, Client Components, or client-side props.
3. The AI SDK Gateway provider reads `AI_GATEWAY_API_KEY` by default.
4. `AI_GATEWAY_URL` is project configuration for a custom Gateway base URL. If it is used, wire it explicitly through `createGateway({ apiKey, baseURL })`; do not assume the AI SDK reads `AI_GATEWAY_URL` automatically.
5. Keep typed access to these values in `server/env.ts` or server-only domain code.

## 5. Server and Client Boundary Rules

1. Keep model calls, tool execution, provider configuration, API keys, and privileged AI orchestration on the server side.
2. Client Components may import `@ai-sdk/react` UI hooks and shared UI message types, but must not import server-only agent instances, Gateway configuration, or secret-bearing modules.
3. Shape and validate request payloads in route handlers before passing them to model calls.
4. Return only safe streamed or structured responses to the client.
5. Keep substantial AI domain logic in `server/<domain>/` rather than embedding it directly in `app/api/**/route.ts`.
6. If the `ai-sdk` skill examples use `lib/agents` or `lib/tools`, adapt that placement to this repository's architecture: server-only agents, tools, model calls, and Gateway configuration belong in `server/<domain>/`; only lightweight cross-runtime helpers belong in `lib/` or `shared/`.

## 6. Route Handler Rule

Use `app/api/**/route.ts` for AI SDK chat or streaming endpoints when the client needs an HTTP transport such as `useChat`.

Rules:

1. Keep the route handler thin: parse, validate, authenticate or authorize when needed, call server-side AI logic, and return the stream or response.
2. Do not use internal AI route handlers as the data layer for ordinary Server Component rendering.
3. Apply the route-handler and boundary rules in `.ai-rules/core/project-architecture-rules.md` for input validation, auth, safe errors, and response shaping.

## 7. Verification Rule

For AI SDK changes:

1. Run static verification such as `pnpm lint` or a narrower TypeScript check when available.
2. For streaming UI behavior, use browser-backed verification when a dev server is already running or the user approves starting one.
3. Do not make live model calls in tests by default. Prefer mocks or controlled fakes unless the user explicitly asks for live integration verification.
4. For choosing between isolated tests and browser-based verification, follow `.ai-rules/core/testing-and-integration-rules.md`.
