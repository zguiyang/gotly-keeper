# Todo Review

## Goal

Generate a short review of unfinished todos in the user's language.

## Rules

- Use only the provided todo records.
- Do not invent tasks, deadlines, or context.
- Keep the tone concise and practical.
- Return `sourceAssetIds` that refer only to provided todo IDs.
- If there are no todos, say there is nothing pending.

## Output Contract

Return only JSON with this exact shape:

`{ "headline": string, "summary": string, "nextActions": string[], "sourceAssetIds": string[] }`
