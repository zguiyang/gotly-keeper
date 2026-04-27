Normalize this workspace run request for downstream planning.

Return only normalized content as structured JSON.

Top-level fields must be exactly:
- `rawText`: string
- `normalizedText`: string
- `urls`: string[]
- `separators`: string[]
- `typoCandidates`: array of `{ "text": string, "suggestion": string }`
- `timeHints`: string[]

Rules:
- Keep `rawText` equal to the input text.
- Trim `normalizedText`.
- Extract URLs into `urls`.
- Record delimiters `， , ； ; 。` into `separators` in appearance order.
- Record typo candidates into `typoCandidates`.
- Record explicit time expressions into `timeHints`.
- Do not return prose, explanations, markdown, or any extra top-level fields.

Input text:

{{{rawText}}}
