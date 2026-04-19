import { describe, expect, it, vi } from 'vitest'

import { BaseWorker } from '@/server/workers/base.worker'

describe('BaseWorker', () => {
  it('waits for idle delay before polling again when queue is empty', async () => {
    vi.useFakeTimers()

    try {
      const stopError = new Error('stop-loop')
      let dequeueCalls = 0

      class TestWorker extends BaseWorker<number> {
        constructor() {
          super('test-worker', { idleDelayMs: 300 })
        }

        protected async dequeueTask(): Promise<number | null> {
          dequeueCalls += 1

          if (dequeueCalls === 1) {
            return null
          }

          throw stopError
        }

        protected async handleTask(task: number): Promise<void> {
          void task
        }

        protected async onError(error: unknown, task: number | null): Promise<void> {
          void task
          if (error === stopError) {
            throw error
          }
        }
      }

      const startPromise = new TestWorker().start()
      const observedOutcome = startPromise.then(
        () => ({ success: true as const, error: null }),
        (error: unknown) => ({ success: false as const, error })
      )

      await vi.advanceTimersByTimeAsync(299)
      expect(dequeueCalls).toBe(1)

      await vi.advanceTimersByTimeAsync(1)
      const outcome = await observedOutcome
      expect(outcome.success).toBe(false)
      expect(outcome.error).toBe(stopError)
      expect(dequeueCalls).toBe(2)
    } finally {
      vi.useRealTimers()
    }
  })

  it('continues polling when dequeue returns null', async () => {
    const stopError = new Error('stop-loop')
    const handledTasks: number[] = []
    let idleCount = 0

    class TestWorker extends BaseWorker<number> {
      private readonly tasks: Array<number | null> = [null, 42]

      constructor() {
        super('test-worker')
      }

      protected async dequeueTask(): Promise<number | null> {
        if (this.tasks.length === 0) {
          throw stopError
        }

        return this.tasks.shift() ?? null
      }

      protected async handleTask(task: number): Promise<void> {
        handledTasks.push(task)
      }

      protected async onIdle(): Promise<void> {
        idleCount += 1
      }

      protected async onError(error: unknown, task: number | null): Promise<void> {
        void task
        if (error === stopError) {
          throw error
        }
      }
    }

    await expect(new TestWorker().start()).rejects.toBe(stopError)
    expect(idleCount).toBe(1)
    expect(handledTasks).toEqual([42])
  })

  it('routes task processing errors to onError and keeps running', async () => {
    const stopError = new Error('stop-loop')
    const processed: number[] = []
    const reportedErrors: string[] = []

    class TestWorker extends BaseWorker<number> {
      private readonly tasks: Array<number | null> = [1, 2]

      constructor() {
        super('test-worker')
      }

      protected async dequeueTask(): Promise<number | null> {
        if (this.tasks.length === 0) {
          throw stopError
        }

        return this.tasks.shift() ?? null
      }

      protected async handleTask(task: number): Promise<void> {
        if (task === 1) {
          throw new Error('task failed')
        }
        processed.push(task)
      }

      protected async onError(error: unknown, task: number | null): Promise<void> {
        void task
        if (error === stopError) {
          throw error
        }

        reportedErrors.push(error instanceof Error ? error.message : String(error))
      }
    }

    await expect(new TestWorker().start()).rejects.toBe(stopError)
    expect(processed).toEqual([2])
    expect(reportedErrors).toEqual(['task failed'])
  })
})
