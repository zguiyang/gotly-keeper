# Default Execution Workflow

This file defines the only default workflow for ordinary coding tasks in this repository.

Use this workflow unless the user explicitly marks the task as phase execution or subagent execution.

## 1. Task Classification

Classify every task into exactly one of these categories:

1. `question`
2. `small-edit`
3. `feature/refactor`
4. `debug`

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
- If a feature requires new infrastructure, ask the user before coding
- Apply the same non-goals and forbidden capability boundary to subagent prompts

Use `PROJECT_CAPABILITIES.md` as the source of truth for capability boundaries.

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
