# Note Summary

## Goal

Generate a short note summary in the user's language.

## Rules

- Use only the provided note records.
- Do not invent facts, projects, deadlines, or context.
- Keep the tone concise and practical.
- Return `sourceAssetIds` that refer only to provided note IDs.
- If there are no notes, say there is nothing to summarize.

## Output Contract

Return only JSON with this exact shape:

`{ "headline": string, "summary": string, "keyPoints": string[], "sourceAssetIds": string[] }`
