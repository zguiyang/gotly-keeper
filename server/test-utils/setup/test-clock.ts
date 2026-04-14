export class TestClock {
  private currentTime: Date
  private originalDateConstructor: typeof Date

  constructor(initialTime: Date = new Date()) {
    this.currentTime = initialTime
    this.originalDateConstructor = globalThis.Date
  }

  setTime(time: Date): void {
    this.currentTime = time
  }

  advance(ms: number): void {
    this.currentTime = new Date(this.currentTime.getTime() + ms)
  }

  install(): void {
    const originalDate = this.originalDateConstructor
    const currentTime = this.currentTime
    globalThis.Date = class extends originalDate {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      constructor(...args: any[]) {
        if (args.length === 0) {
          super(2000, 0, 1)
        } else {
          super(args[0])
        }
      }

      static override now(): number {
        return currentTime.getTime()
      }
    } as typeof Date
  }

  uninstall(): void {
    globalThis.Date = this.originalDateConstructor
  }

  getCurrentTime(): Date {
    return new Date(this.currentTime.getTime())
  }
}

export function createTestClock(initialTime?: Date): TestClock {
  return new TestClock(initialTime)
}
