---
name: publish-version
description: Publish a new project version — analyze conventional commits, propose version, generate CHANGELOG.md, commit, tag, push, and optionally deploy.
license: MIT
---

# Publish Version

Publish a new version of Gotly Keeper. All output (commits, CHANGELOG.md, release summary) is in **English**.

## Workflow Overview

The skill has three phases — the first two are **read-only**, preceded by a **pre-flight check**:

| Phase | Description | Writes to disk? |
|-------|-------------|----------------|
| **0. Pre-flight** | Verify a new version is actually needed | ❌ No |
| **1. Analysis** | Read current version, git tags, commit history | ❌ No |
| **2. Preview & Confirm** | Present analysis + version choice + preview of CHANGELOG.md entry & release summary | ❌ No |
| **3. Execute** | Write files, commit, tag, push, optional deploy | ✅ Yes |

---

## Phase 0: Pre-flight Check (read-only)

Before doing anything, check whether a new version is actually warranted.

### 0.1 Detect latest tag and new commits

```shell
git tag --sort=-v:refname | head -1
git rev-parse HEAD
git rev-parse <latest-tag>^{commit}
```

Use `run_command` to get the latest tag name, HEAD's commit hash, and the tag's commit hash (append `^{commit}` to dereference annotated tags to their commit). Compare them.

```shell
git log <latest-tag>..HEAD --oneline
```

If no tags exist, get all commits.

### 0.2 Check for uncommitted changes

```shell
git status --porcelain
```

If there are uncommitted changes, warn the user that publish may include unintended files.

### 0.3 Classify commits by type

Parse the commit messages to determine what kind of changes exist:

| Commit type | Meaningful? | Release-worthy? |
|-------------|-------------|----------------|
| `feat:` | ✅ Yes | New feature — worth a release |
| `fix:` | ✅ Yes | Bug fix — worth a release |
| `perf:` | ✅ Yes | Performance improvement — worth a release |
| `refactor:` | ❌ No | Pure code restructuring, no behavior change |
| `style:` | ❌ No | Code formatting only (per conventional commits spec) |
| `chore:` | ❌ No | Tooling/maintenance |
| `docs:` | ❌ No | Documentation only |
| `ci:` | ❌ No | CI config changes |
| `build:` | ❌ No | Build system changes |
| `revert:` | ❌ No | Revert of a previous change |
| `test:` | ❌ No | Adding/modifying tests |

**Rules:**
- Scan ALL commits since the last tag
- If **any** commit is `feat:`, `fix:`, or `perf:` → there is meaningful change
- If ALL commits are only `refactor:`, `style:`, `chore:`, `docs:`, `ci:`, `build:`, `revert:`, `test:` → there is **no meaningful functional change**

### 0.4 Decision gate

Choose the appropriate scenario below.

---

**Scenario A: Latest tag matches HEAD.**

```
Current state: everything already published.
Latest tag: v0.1.4 @ abc1234
HEAD:        abc1234 (same commit)

No new commits since the last tag.

No new commits to publish. Proceed anyway?
```

Use `ask_choice`:
- `Proceed anyway (re-publish or hotfix tag)` → continue to Phase 1
- `Cancel` → stop immediately

---

**Scenario B: New commits exist, but ALL are non-meaningful** (only refactor/style/chore/docs/ci/build/revert/test).

```
Current state: new commits exist, but no functional changes detected.
Latest tag: v0.1.4
New commits: 5
  refactor: 3   style: 1   chore: 1

These are code maintenance / formatting changes only — nothing functionally
new to publish. Are you sure you want to create a version?

> Yes, publish anyway
  No, cancel
```

Use `ask_choice`:
- `Yes, publish anyway` → continue to Phase 1
- `No, cancel` → stop immediately

---

**Scenario C: New commits exist with meaningful changes** (at least one feat/fix/perf).

```
Current state: new commits detected with functional changes.
Latest tag: v0.1.4
New commits: 8
  feat: 2   fix: 3   refactor: 2   chore: 1

Functional changes detected — ready to publish.
```
 
Proceed directly to Phase 1 — **no warning needed**.

---

**Scenario D: No tags exist at all.**

Proceed to Phase 1 — note that this is a first-time publish.

---

**If user cancels at any point in this phase**: stop immediately. **Do not proceed to Phase 1. No files written.**

---

## Phase 1: Analysis (read-only)

Use the data already gathered in Phase 0 (latest tag, commit list). Do NOT re-run the same git commands.

### 1.1 Gather current state

Read `package.json` to get the current `version` field. Use `read_file` to get the exact line.

### 1.2 Get commits since last tag

Already gathered in Phase 0.1 — reuse that data. If no tags exist, use all commits.

### 1.3 Analyze conventional commits

Parse each commit message to determine the semver bump:

| Pattern | Bump |
|---------|------|
| `BREAKING CHANGE` in body, or `!` after type (e.g. `feat!:`, `fix!:`) | **major** |
| `feat:` | **minor** |
| `fix:`, `perf:`, `refactor:`, `style:`, `test:` | **patch** |
| `chore:`, `docs:`, `ci:`, `build:`, `revert:` | Skip (internal tooling, not shown in CHANGELOG.md) |

The highest priority match wins — one breaking change makes it major regardless of other commits.

Also build a categorized list of **meaningful commits** (excluding chore/docs/ci/build) structured for CHANGELOG.md content. For each commit, strip the type prefix and hash, keep only the descriptive text.

### 1.4 Check pre-release tag numbering

If tags include pre-release versions like `vX.Y.Z-alpha.N`, `vX.Y.Z-beta.N`, or `vX.Y.Z-rc.N`, note the highest N for each channel so the next pre-release can increment properly.

---

## Phase 2: Preview & Confirm (read-only)

### 2.1 Present version options

Show the analysis summary to the user (as prose text), then use `ask_choice` to let them pick.

**Example output** (replace with actual numbers):

```
Current version: 0.1.4
Latest tag: v0.1.4
Commits since tag: 12
  feat: 2   fix: 5   refactor: 3   chore: 2
Recommended: patch bump → v0.1.5
```

Then present version options via `ask_choice`:

If analysis suggests **patch** (default):
- `0.1.5` (stable — recommended)
- `0.1.5-beta.1` (beta pre-release)
- `0.1.5-alpha.1` (alpha pre-release)
- `0.2.0` (minor)
- `1.0.0` (major)
- `Custom version`

If analysis suggests **minor**:
- `0.2.0` (stable — recommended)
- `0.2.0-beta.1` (beta pre-release)
- `0.2.0-alpha.1` (alpha pre-release)
- `0.1.5` (patch)
- `1.0.0` (major)
- `Custom version`

If analysis suggests **major**:
- `1.0.0` (stable — recommended)
- `1.0.0-beta.1` (beta pre-release)
- `1.0.0-alpha.1` (alpha pre-release)
- `0.2.0` (minor)
- `0.1.5` (patch)
- `Custom version`

If user picks `Custom version`, call `ask_choice` a second time with `allowCustom: true` to let them type the exact version string.

### 2.2 Generate preview content

Based on the chosen version, generate two pieces of content. **Do NOT write to disk yet.**

#### A. CHANGELOG.md entry (detailed, per-commit)

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
- Feature description (from feat commits)

### Fixed
- Bug fix description (from fix commits)

### Changed
- Description (from perf / refactor commits)
```

Format rules:
- Run `date +%Y-%m-%d` and use its output as the date (ISO format)
- Strip commit type prefix (`feat:`, `fix:`, etc.) and commit hash from each message
- Keep only the descriptive text in English
- Capitalize the first letter of each entry
- Categorize by type as shown above
- Merge duplicate or closely related commits into one entry
- If no commits for a category, omit it entirely
- `BREAKING CHANGE` commits go in a `### ⚠ BREAKING CHANGES` section at the top, even above `### Added`

#### B. Release note (concise summary)

A short high-level summary in English, suitable for GitHub Releases. Write it as:

```markdown
# Release vX.Y.Z

### New Features
- One bullet per logical feature (merge related feat commits)

### Bug Fixes
- One bullet per fix (merge related fix commits)

### Breaking Changes
- One bullet per breaking change
```

This is **much shorter** than the CHANGELOG.md entry — one bullet per logical change, not per commit. Merge related commits into single bullets.

The release summary is **preview-only** — it is displayed for you to copy (e.g. to GitHub Releases) but is NOT saved as a separate file.

### 2.3 Show preview and ask confirmation

Display the version, CHANGELOG.md entry, and release summary to the user in a clear formatted output.

Then use `ask_choice` to confirm:

```
Ready to publish v0.1.5:

── CHANGELOG.md entry ──────────────────
## [0.1.5] - 2025-01-15

### Added
- New workspace bookmark filtering
- Support for AI prompt templates

### Fixed
- Session token refresh race condition
- Drizzle migration ordering

── Release summary (preview, not saved to file) ──────
# Release v0.1.5

### New Features
- Bookmark filtering and AI prompt template support

### Bug Fixes
- Fixed session token refresh and migration ordering

─────────────────────────────────────

Proceed with publishing?

> Yes, publish now
  No, cancel
```

If the user picks `No, cancel`, stop and report. **Do not write anything.**

---

## Phase 3: Execute (write phase)

**Critical rule: stop on first failure — applies to the entire Phase 3 (3.1 → 3.7).** Every step depends on the previous one. If any command fails, any edit is rejected, or any tool call errors, **stop immediately**, report the exact error to the user, and do NOT proceed to any subsequent step. Do not skip over the failure or try alternative steps. The repository will be left in a consistent (pre-failure) state.

### 3.1 Update package.json version

Use `edit_file` to replace the `"version"` field in `package.json`. Read the file first to match the exact line (whitespace-sensitive).

If the edit is rejected (e.g., search text not found), report the failure to the user and stop. **Do not proceed.**

### 3.2 Write CHANGELOG.md

If `CHANGELOG.md` does **not** exist at the project root:
- Create it with `write_file`:
  ```markdown
  # Changelog

  [full CHANGELOG.md entry from preview]
  ```

If `CHANGELOG.md` **already exists**:
- Read the current file content
- Insert the new entry **right after** the `# Changelog` header line (on a new blank line after the header), before any existing entries — newest first ordering.
- Use `edit_file` or `multi_edit` as appropriate.

If the write/edit fails (e.g., tool error), report the failure to the user and stop. **Do not proceed.**

### 3.3 Git commit

Stage the changed files and commit:

```shell
git add package.json CHANGELOG.md
git commit -m "chore: bump version to X.Y.Z"
```

If other files were also modified during the session and staged, use `git add` with only the two intended files.

If `git commit` fails (e.g., nothing to commit, pre-commit hook rejects), report the error to the user and stop. **Do not proceed.**

### 3.4 Git tag

```shell
git tag -a vX.Y.Z -m "vX.Y.Z"
```

If `git tag` fails (e.g., tag already exists), report the error to the user and stop. **Do not proceed.**

### 3.5 Git push

```shell
git push
git push --tags
```

If push fails (no remote, permission error, network issue), show the error clearly and stop. **Do not proceed.** The commit and tag exist locally — tell the user they can push manually later.

### 3.6 Create GitHub Release

Create a GitHub Release using the release summary content from Phase 2.

First, check that `gh` CLI is available and authenticated:

```shell
gh auth status
```

If `gh` is not installed or not authenticated, show a message telling the user to install (`brew install gh` / `apt install gh`) or authenticate (`gh auth login`), and provide the release summary for manual creation.

If `gh` is ready, write the release summary to a temp file with `write_file`, then create the release:

```shell
gh release create vX.Y.Z --title "vX.Y.Z" --notes-file /tmp/gh-release-notes.md
```

Steps:
1. Use `write_file` to write the release summary content to `/tmp/gh-release-notes.md`
2. Run the `gh release create` command above
3. Run `rm /tmp/gh-release-notes.md` to clean up

**Important**: Use the exact release summary text already generated in Phase 2.2.B and shown in the preview above. Do NOT regenerate from the format template — reuse the literal text from the preview.

If the command succeeds, confirm to the user. If it fails (e.g., tag not pushed yet, permission issue), show the error and stop. **Do not proceed.** Tell the user they can create the release manually at `https://github.com/<owner>/<repo>/releases/new`.

### 3.7 Optional deploy

After publish completes, use `ask_choice`:

```
Publish complete. Run deploy.sh now?

> Yes, run deploy.sh
  No, skip
```

If yes, run:

```shell
bash deploy.sh
```

Report the result. If `deploy.sh` doesn't exist, skip gracefully with a message.

---

## Error Handling

| Scenario | Response |
|----------|----------|
| **No commits since last tag** | Warn the user and ask if they still want to create a version |
| **No git tags exist at all** | Use all commits as scope; note this in the analysis output |
| **Git push fails** | Commit + tag exist locally; tell user to push manually |
| **gh CLI not installed/authenticated** | Provide release summary text for manual creation on GitHub |
| **gh release create fails** | Tag and commit are pushed; tell user to create release manually at GitHub.com |
| **deploy.sh not found** | Skip gracefully, report file missing |
| **User cancels at preview** | Stop immediately, no files touched |
| **No remote configured** | Commit + tag locally, inform user no remote to push to |
