import { z } from 'zod'

export const todoReviewOutputSchema = z.object({
  headline: z.string().min(1).max(80),
  summary: z.string().min(1).max(600),
  nextActions: z.array(z.string().min(1).max(120)).max(5),
  sourceAssetIds: z.array(z.string().min(1)).min(1).max(10),
})

export type TodoReviewOutput = z.infer<typeof todoReviewOutputSchema>