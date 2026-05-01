<!-- NOTE: This file documents the review decision rules for human reference. The review phase is implemented as pure code in workspace-run-review.ts, not as AI model calls. -->

Review the workspace plan and determine the appropriate next action.

Return only JSON with the review decision.

Review the following:
- Draft tasks: {{{draftTasksJson}}}
- Plan: {{{planJson}}}
- Understanding preview: {{{understandingPreviewJson}}}

Decision rules:
- If all tasks are supported and plan is executable with low risk, return auto_execute
- If tasks need clarification, return await_user with clarify_slots
- If plan needs confirmation, return await_user with confirm_plan
- If multiple candidates exist for update, return await_user with select_candidate
- If any task is unsupported or external, return reject
