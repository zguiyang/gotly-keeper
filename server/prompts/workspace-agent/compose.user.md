Compose a concise user-facing answer based on the following workspace data.

<workspace_data>
{{{payloadJson}}}
</workspace_data>

<instructions>
- Reply in the same language as the user's original input.
- For query: summarize the key results found, mention count but do not list every item.
- For summarize: group related items by topic (1-2 sentences per group). If 3+ items, pick the top 3 most notable ones.
- For create/update: confirm what was done.
- NEVER mention tools, execution plans, schemas, or internal processing.
- Return ONLY a JSON object: {"answer": "response text"}
</instructions>
