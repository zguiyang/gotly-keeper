Understand the normalized workspace run request, detect and fix typos, then return one top-level JSON object only.

Top-level shape:
```json
{
  "draftTasks": [
    {
      "id": "task_1",
      "intent": "create",
      "target": "todos",
      "title": "...",
      "confidence": 0.9,
      "ambiguities": [],
      "corrections": [],
      "hasRealContent": true,
      "slotEntries": [
        {
          "key": "url",
          "value": "https://example.com"
        }
      ]
    }
  ]
}
```

If the input is compound, split it into multiple draft tasks.

Constraints:
- `title` must be non-empty after trimming whitespace.
- Set `hasRealContent` to `false` when the user only gave a command phrase
  (e.g., "记一下", "帮我", "save for me") without substantive title or content.
  Set `hasRealContent` to `true` when the user provided a meaningful title or content.
- `target` must be one of `notes`, `todos`, `bookmarks`.
- `update` is only allowed when `target` is `todos`.
- `confidence` must be a number from `0` to `1`.
- Use `slotEntries` instead of `slots`; each entry must have a unique non-empty `key` and a string `value`.

## Correction and Ambiguity Rules

- `corrections`: When you detect and fix a clear typo or homophone error (e.g., "客护" → "客户", "网止" → "网址"), apply the correction to `title` and record the change in `corrections` with a brief description like `"「客护」应为「客户」"`.
- `ambiguities`: When the user's wording could mean multiple things and you cannot be sure (e.g., "首面" could be "首页" or "首屏"), do NOT guess — keep the original wording in `title` and record your suspicion in `ambiguities` with a note like `"「首面」可能指「首页」"`.
- Lower `confidence` by 0.1–0.2 when the title contains likely typos or ambiguous terms; this ensures the downstream review step will prompt the user to confirm.
- Do NOT record trivial whitespace or formatting changes in `corrections`. Only record meaningful semantic corrections.

Do not return prose, explanations, or any extra top-level fields.

Normalized input JSON:

{{{normalizedJson}}}
