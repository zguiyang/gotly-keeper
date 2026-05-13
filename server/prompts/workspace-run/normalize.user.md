## Input

<raw_text>
{{{rawText}}}
</raw_text>

## Task

Normalize the raw text above for downstream planning.
Return ONLY the JSON object. Do not include prose.

Output fields:
- `rawText`: string — the original input (do NOT modify)
- `normalizedText`: string — cleaned text with greetings/filler removed
- `urls`: string[] — extracted URLs
- `separators`: string[] — common delimiter characters (`,`, `;`, `.` and their fullwidth equivalents) in order of appearance
- `typoCandidates`: [{text: string, suggestion: string}] — suspected typos and corrections
- `timeHints`: string[] — explicit time expressions found in the input
