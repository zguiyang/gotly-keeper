## Input Data

<normalized_input>
{{{normalizedJson}}}
</normalized_input>

## Task

Analyze the input above and return a semantic split result.

Requirements:
- Decide whether the input is a single task unit or multiple task units.
- Split only when the user expresses meaningfully separate task units and the split is reliable enough for downstream execution.
- If you are unsure whether a segment is truly independent, keep it attached to the current task.
- Keep each `segments.text` concise but faithful to the user intent.
- Record obvious typo or wording corrections in `corrections`.
- Add `operationCue` so downstream code can tell a fresh capture apart from a continuation.
- Return only the JSON object. Do not include prose.
