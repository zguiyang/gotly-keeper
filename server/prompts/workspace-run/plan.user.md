Plan hints only for a single workspace draft task.

Return only JSON when asked.

Draft task JSON:

{{{draftTaskJson}}}

Rules:
- This phase is planning only.
- Any real write action happens only in the later execution phase.
- Do not decide to directly execute any write operation in planning.
- Do not invent asset ids, URLs, titles, or times.
- Preserve ambiguity instead of guessing.
- Return only minimal planning hints that help the planner choose a final action.
- Allowed JSON shape:
  - `action`: one of `create_note`, `create_todo`, `create_bookmark`, `query_assets`, `summarize_assets`, `update_todo`
  - optional `title`: string
  - optional `query`: string
  - optional `reason`: string
- Only map the task into one of these actions:
  - `create_note`
  - `create_todo`
  - `create_bookmark`
  - `query_assets`
  - `summarize_assets`
  - `update_todo`
- If no useful hint is available, return an empty JSON object.
