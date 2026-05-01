Analyze the user's natural language input. Convert it into one or more draft tasks following the semantics and extraction rules defined in the system prompt.

## Output Format

```json
{
  "draftTasks": [
    {
      "id": "task_1",
      "intent": "create",
      "target": "todos",
      "title": "买菜",
      "confidence": 0.9,
      "ambiguities": [],
      "corrections": [],
      "hasRealContent": true,
      "slotEntries": [
        { "key": "timeText", "value": "明天" }
      ]
    }
  ]
}
```

## Key Requirements

- May output one or more draft tasks. Split only for genuinely independent operations.
- `title` must NOT contain time expressions or command prefixes.
- `hasRealContent: false` when the user only provides a command word without substance.
- Return ONLY the JSON object — no prose, no explanation.

Normalized input:

{{{normalizedJson}}}
