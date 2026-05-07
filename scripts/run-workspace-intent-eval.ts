import 'dotenv/config'

import {
  DEFAULT_WORKSPACE_INTENT_EVAL_DATASET_PATH,
  formatWorkspaceIntentEvalSummary,
  loadWorkspaceIntentEvalDataset,
  runWorkspaceIntentEvalDataset,
  summarizeWorkspaceIntentEvalRun,
} from '@/server/modules/workspace-agent/workspace-intent-eval'

async function main() {
  const datasetPath = process.argv[2] ?? DEFAULT_WORKSPACE_INTENT_EVAL_DATASET_PATH
  const dataset = await loadWorkspaceIntentEvalDataset(datasetPath)
  const startedAt = Date.now()

  console.log(`Running workspace intent eval with ${dataset.cases.length} cases`)
  console.log(`Dataset: ${datasetPath}`)

  const results = await runWorkspaceIntentEvalDataset({ dataset })
  const summary = summarizeWorkspaceIntentEvalRun(results)

  console.log('')
  console.log(formatWorkspaceIntentEvalSummary(summary))

  if (summary.mismatches.length > 0) {
    console.log('')
    console.log('Mismatches:')

    for (const mismatch of summary.mismatches) {
      console.log(`- ${mismatch.caseId} [${mismatch.bucket}]`)
      console.log(`  input: ${mismatch.input}`)
      console.log(
        `  expected: ${mismatch.expected.actionClass}/${mismatch.expected.target}, actual: ${mismatch.actual.actionClass}/${mismatch.actual.target}`
      )
      console.log(`  reason: ${mismatch.actual.reason}`)
      if (mismatch.error) {
        console.log(`  error: ${mismatch.error}`)
      }
    }
  }

  console.log('')
  console.log(`Finished in ${Date.now() - startedAt}ms`)

  process.exitCode = summary.mismatches.length > 0 ? 1 : 0
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
