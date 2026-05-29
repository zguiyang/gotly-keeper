# Changelog

## [0.2.0] - 2026-05-27

### Added
- Update workspace components
- Update useAssetMutations hook
- Update i18n for workspace features
- Add graceful shutdown with stop signal for worker
- Localize workspace UI phase messages and fix hook violation
- Internationalize note/todo/bookmark summary fallback text
- Internationalize compose phase fallback messages
- Inject system locale into AI prompt pipeline
- Add publish-version skill with pre-flight, CHANGELOG, and gh release

### Fixed
- Correct date timezone and content fallback in workspace actions
- Cache URL safety checks, release reader lock, and improve DNS error in metadata

### Changed
- Extract magic numbers, deduplicate result, and fix orchestrator edge cases in workspace-agent
- Remove dead code, unused exports, and simplify expressions
- Rewrite landing page with new 5-section structure and pragmatic copy

## [0.1.4] - 2026-05-22

### Added
- **i18n infrastructure** — Integrated next-intl framework with locale files (en/zh-CN), language switcher, locale hooks, and dynamic `generateMetadata`
- **i18n: Landing page, layout & manifest** — Migrated landing page text to `getServerTranslation()`, added locale-aware manifest
- **i18n: Auth pages & theme toggle** — Full i18n support for sign-in, sign-up, reset-password pages and forms; added `formatError` callback for translated server error messages
- **i18n: Workspace components & config** — All workspace components migrated to `useTranslations`; added `tKey` field and `getAssetLocaleKey()` utility
- **i18n: Server modules, API routes & shared utilities** — Server actions, API routes error messages use `getServerTranslationSafe`; shared utils (time, dayjs, constants) also internationalized

### Fixed
- Removed invalid JSX comments inside opening tags, fixed build error
- Resolved all TypeScript and ESLint errors: added missing `t` dependencies in hooks, fixed test file imports, removed `dangerouslyAllowAllBuilds: true` from workspace config

## [0.1.3] - 2026-05-21

### Added
- Add mobile bottom navigation with dvh viewport support
- Remove workspace entry button from landing page navbar

### Fixed
- Fix bookmark title trim priority, URL type handling, and prompt improvements
- Fix duplicate handling for note/summary against URL in buildBookmarkRawInput
- Fix bookmark URL parsing and add worker debug logging
- Fix sync between app-meta version and package.json
- Fix padding consistency in workspace layout
- Improve a11y for action menus, textarea, and filter tabs
- Remove duplicate close icon in mobile sheet drawer

### Changed
- Redesign workspace interaction cards with warm modern style
- Redesign AI parsing panel with phase timeline
- Refresh UI primitives and responsive layout

### Dependencies
- Upgrade pnpm to v11.1.2 and migrate config to pnpm-workspace.yaml

## [0.1.2] - 2026-05-17

### Fixed
- Hide login/register buttons on mobile nav

## [0.0.1] - 2026-05-17

### Overview

First initial release of Gotly Keeper — an AI-powered personal knowledge management workspace.

### Added
- **AI Workspace**: Create notes, todos, bookmarks via natural language
- **Smart Understanding**: AI parses input intent, auto-classifies and extracts time
- **Asset Management**: Full CRUD for notes, todos, and bookmarks
- **Smart Search**: Vector semantic search + full-text retrieval
- **Todo Board**: Quadrant view + calendar view + completed summary
- **Auth System**: Email/password + GitHub OAuth + password reset
- **Dark Mode**: Full dark/light theme switching
- **PWA Support**: Installable as desktop app

### Tech Stack

Next.js + Better Auth + Drizzle ORM + PostgreSQL (pgvector) + AI SDK (Vercel) + shadcn/ui + Tailwind CSS

### Stats

517 commits
