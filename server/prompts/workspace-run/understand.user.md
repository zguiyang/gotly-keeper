## Input Data

<normalized_input>
{{{normalizedJson}}}
</normalized_input>

<inherited_corrections>
{{{inheritedCorrectionsJson}}}
</inherited_corrections>

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
- Respect inherited corrections when they clarify obvious user wording mistakes.
- Preserve strong capture prefixes. A capture-style prefix such as "save this" should stay note-like unless the user explicitly asks for a todo or reminder.
- If a likely record type is still recoverable after minor wording noise, preserve the likely type. If uncertainty remains, clarify the record type before asking for more details.
- `title` must NOT contain time expressions or command prefixes.
- `hasRealContent: false` when the user only provides a command word without substance.
- Return ONLY the JSON object — no prose, no explanation.
