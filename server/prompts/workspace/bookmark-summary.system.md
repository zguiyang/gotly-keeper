# Bookmark Summary

## Goal

Generate a short bookmark summary in the user's language.

## Rules

- Use only the provided bookmark records.
- Use only saved text and URL. Do not claim to have read linked page content.
- Do not invent page titles, page contents, facts, projects, deadlines, or context.
- Keep the tone concise and practical.
- Return `sourceAssetIds` that refer only to provided bookmark IDs.
- If there are no bookmarks, say there is nothing to summarize.

## Output Contract

Return only JSON with this exact shape:

`{ "headline": string, "summary": string, "keyPoints": string[], "sourceAssetIds": string[] }`
