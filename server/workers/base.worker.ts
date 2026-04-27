import 'server-only'

type BaseWorkerOptions = {
  idleDelayMs?: number
  errorDelayMs?: number
}

export abstract class BaseWorker<TTask> {
  private readonly idleDelayMs: number
  private readonly errorDelayMs: number

  constructor(
    readonly name: string,
    options: BaseWorkerOptions = {}
  ) {
    this.idleDelayMs = options.idleDelayMs ?? 300
    this.errorDelayMs = options.errorDelayMs ?? 50
  }

  async start(): Promise<never> {
    for (;;) {
      let task: TTask | null = null

      try {
        task = await this.dequeueTask()
        if (!task) {
          await this.onIdle()
          if (this.idleDelayMs > 0) {
            await this.sleep(this.idleDelayMs)
          }
          continue
        }

        await this.handleTask(task)
      } catch (error) {
        await this.onError(error, task)
        if (this.errorDelayMs > 0) {
          await this.sleep(this.errorDelayMs)
        }
      }
    }
  }

  protected abstract dequeueTask(): Promise<TTask | null>

  protected abstract handleTask(task: TTask): Promise<void>

  protected async onIdle(): Promise<void> {}

  protected async onError(error: unknown, task: TTask | null): Promise<void> {
    console.error(`[worker:${this.name}] worker loop failed`, {
      error,
      task,
    })
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, ms)
    })
  }
}
