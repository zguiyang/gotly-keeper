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
