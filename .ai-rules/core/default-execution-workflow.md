# Default Execution Workflow

This file defines the only default workflow for ordinary coding tasks in this repository.

Use this workflow unless the user explicitly marks the task as phase execution or subagent execution.

## 1. Task Classification

Classify every task into exactly one of these categories:

1. `question`
2. `small-edit`
3. `feature/refactor`
4. `debug`

Governance or rule-editing work is not a fifth category. Classify it by size and risk using the four categories above, then load the governance context listed in `.ai-rules/core/README.md`.

## 2. Minimal Execution Loop

Follow this loop in order:

1. Understand the goal and success condition.
2. Load only the minimal rules needed for touched files.
3. Write a short execution spec in conversation:
   - goal
   - non-goals
   - touched areas
   - verification method
4. Execute in small, reversible steps.
5. Verify with the smallest valid check first, then broaden if needed.
6. If verification fails, identify root cause and retry with a focused fix.

### 2.1 Non-Goals Gate (MANDATORY)

Before implementation, explicitly list:

- what is NOT being implemented
- what existing system capabilities must NOT be extended

Rules:

- Do NOT introduce new subsystems (email, payment, queue, etc.)
- Do NOT assume missing features should be implemented
- Do NOT add compatibility layers, fallback branches, or defensive defaults unless an existing contract, persisted data shape, or external consumer clearly requires them
- If the need for compatibility or fallback behavior is uncertain, ask the user before coding instead of inventing a "safe" path
- If a feature requires new infrastructure, ask the user before coding
- Apply the same non-goals and forbidden capability boundary to subagent prompts

Use `PROJECT_CAPABILITIES.md` as the source of truth for capability boundaries.

### 2.2 Compatibility/Fallback Clarification Trigger (MANDATORY)

Before implementation, stop and ask the user if the change appears to require any of the following but the requirement is not already explicit:

- backward-compatibility code
- legacy adapters or dual-path logic
- fallback branches for uncertain runtime states
- defensive defaults that silently change accepted input, output, or control flow
- permissive parsing or normalization added only to make the code "more robust"

Rules:

1. Do not choose these patterns proactively just because they feel safer.
2. Do not widen behavior without a confirmed requirement.
3. Prefer the narrowest correct implementation unless the user confirms compatibility or fallback requirements.
4. If the code seems to need one of these patterns to avoid breakage, explain the exact breakage risk and ask the user to decide.

## 3. Non-Default Workflows

The following are not default behavior:

- phase execution workflow
- subagent workflow
- writing plans/reports into `docs/` or `prd/`

Only use these when the user explicitly asks, or when the task explicitly requires cross-session handoff.

## 4. Stability Rules

1. Do not load all domain rules by default.
2. Do not load all skills by default.
3. Do not load advanced workflows by default.
4. Prefer deletion/simplification over adding new process layers.
