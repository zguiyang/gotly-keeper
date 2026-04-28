Understand the normalized workspace run request and return one top-level JSON object only.

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
- `target` must be one of `notes`, `todos`, `bookmarks`.
- `update` is only allowed when `target` is `todos`.
- `confidence` must be a number from `0` to `1`.
- Use `slotEntries` instead of `slots`; each entry must have a unique non-empty `key` and a string `value`.

Do not return prose, explanations, or any extra top-level fields.

Normalized input JSON:

{{{normalizedJson}}}
