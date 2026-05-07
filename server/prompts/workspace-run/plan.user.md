## Input

<draft_task>
{{{draftTaskJson}}}
</draft_task>

## Task

Generate planning hints for the draft task above. This is a planning-only phase — no execution occurs here.

Return exactly one JSON object. Return `{}` if no useful hint is available.

Allowed output shape:
- `action`: "create_note" | "create_todo" | "create_bookmark" | "query_assets" | "summarize_assets" | "update_todo"
- `title`?: string
- `query`?: string
- `reason`?: string

Rules:
- Preserve ambiguity instead of guessing.
- Never invent asset IDs, URLs, titles, or times.
- Do not include fields with `null`, empty strings, or placeholder values.
- Do not return prose before or after the JSON object.
