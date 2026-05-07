Generate a concise summary based on the following bookmark list.

<bookmark_data>
{{{payloadJson}}}
</bookmark_data>

<instructions>
- Write in the user's language.
- Group by topic or source (1-2 sentences per group).
- Use only the provided text and URL.
- Keep the full response under 200 characters.
- Return ONLY JSON: {"headline": "...", "summary": "...", "keyPoints": [...], "sourceAssetIds": [...]}
</instructions>
