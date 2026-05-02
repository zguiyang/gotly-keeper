Generate a short review based on the following todo data.

<todo_data>
{{{payloadJson}}}
</todo_data>

<instructions>
- Write in the user's language.
- Summarize key themes across incomplete todos.
- Extract 1-3 priority next actions.
- Keep under 200 characters.
- Return ONLY JSON: {"headline": "...", "summary": "...", "nextActions": [...], "sourceAssetIds": [...]}
</instructions>
