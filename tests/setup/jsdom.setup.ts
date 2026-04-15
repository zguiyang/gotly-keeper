import { beforeAll, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

beforeAll(() => {
  process.env.NODE_ENV = 'test'
  process.env.TZ = 'UTC'
})

afterEach(() => {
  cleanup()
})
