# Git Commit Rules

## 1. Scope

These rules define how changes must be analyzed, staged, and committed in this repository.

They apply whenever code, configuration, or documentation changes are prepared for git commits.

## 2. Language

- Use English for all commit messages.
- Use English for any short explanatory text included in commit-related artifacts.

## 3. Commit Message Standard

- Every commit message must follow the Conventional Commits specification.
- Use the format: `type(scope): summary` when a scope adds clarity.
- Use the format: `type: summary` when a scope is unnecessary.
- Keep the summary concise, clean, and easy to scan.
- Start the summary with a lowercase verb or noun phrase when it reads naturally.
- Avoid noisy wording, filler, and redundant detail.

Examples:

- `feat(auth): add email sign-in flow`
- `fix(api): handle empty search params`
- `docs: add git commit rules`
- `refactor(modules): extract billing service`

## 4. Default Brevity Rule

- Prefer a single-line commit message.
- Do not add a detailed body unless the change is important enough that the extra context materially improves review or future traceability.
- If a body is necessary, keep it brief and factual.

## 5. Grouping and Batching Rule

Do not commit all changed files in one batch by default.

Before committing:

1. Analyze the full set of changed files.
2. Group files by change purpose and dependency relationship.
3. Split unrelated or loosely related work into separate commits.
4. Stage and commit one coherent batch at a time.

Each commit should represent one clear intent, such as:

- one feature
- one bug fix
- one refactor
- one documentation update
- one test-only change

## 6. Relatedness Rule

Files belong in the same commit only when they support the same change intent.

Good grouping signals:

- the files implement one feature end to end
- the files are required together for one bug fix
- the files are part of one refactor with no unrelated behavior change
- the tests validate the same batch of production changes

Split into separate commits when:

- the changes touch different concerns
- one change can be reviewed independently from another
- a docs update is unrelated to a code fix
- formatting or cleanup is unrelated to behavior changes

## 7. Commit Preparation Workflow

Use this workflow before creating commits:

1. Inspect the changed files.
2. Identify natural commit batches based on relatedness.
3. Stage only the files for the current batch.
4. Write a concise Conventional Commit message.
5. Repeat for the next batch until all intended changes are committed.

Do not skip the analysis step.

## 8. Clean History Rule

- Prefer a small number of well-structured commits over one large mixed commit.
- Prefer meaningful commit boundaries over arbitrary file-count boundaries.
- Avoid "temporary", "misc", "update stuff", or similarly vague messages.
- Do not create commits that hide unrelated work behind a broad summary.

## 9. AI Commit Behavior

When an AI agent prepares commits, it must:

1. review the working tree first
2. propose or infer logical commit batches from the actual file changes
3. avoid staging unrelated files together
4. use English Conventional Commit messages
5. keep messages concise unless the change is important enough to justify extra detail

If the working tree contains unrelated changes that should not be bundled together, the agent must keep them in separate commits.
