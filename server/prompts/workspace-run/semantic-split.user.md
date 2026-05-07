## Input Data

<normalized_input>
{{{normalizedJson}}}
</normalized_input>

## Task

Analyze the input above and return a semantic split result.

Requirements:
- Decide whether the input is a single task unit or multiple task units.
- Split only when the user expresses meaningfully separate task units.
- Keep each `segments.text` concise but faithful to the user intent.
- Record obvious typo or wording corrections in `corrections`.
- Return only the JSON object. Do not include prose.
