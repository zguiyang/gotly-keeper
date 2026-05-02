## Input Data

<normalized_input>
{{{normalizedJson}}}
</normalized_input>

## Task

Convert the natural language input above into one or more draft tasks following the semantics
and extraction rules defined in the system prompt.

Output format:
```json
{
  "draftTasks": [{
    "id": "task_1",
    "intent": "create",
    "target": "todos",
    "title": "action description",
    "confidence": 0.9,
    "ambiguities": [],
    "corrections": [],
    "hasRealContent": true,
    "slotEntries": [{"key": "timeText", "value": "tomorrow"}]
  }]
}
```

Key rules:
- Split into multiple tasks ONLY for genuinely independent operations.
- `title` must NOT contain time expressions or command prefixes.
- `hasRealContent: false` when the user only provides a command word without substance.
- Return ONLY the JSON object — no prose, no explanation.
