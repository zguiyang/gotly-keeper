import { beforeEach, describe, expect, it, vi } from 'vitest'

import { checkUrlSafety } from '@/server/services/bookmark/url-safety'

const mocks = vi.hoisted(() => ({
  lookupMock: vi.fn(),
}))

vi.mock('node:dns/promises', () => ({
  lookup: mocks.lookupMock,
}))

describe('bookmark.url-safety', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects localhost', async () => {
    await expect(checkUrlSafety('http://localhost:3000/a')).resolves.toEqual({
      safe: false,
      reason: 'private_network',
    })
  })

  it('rejects private resolved ip', async () => {
    mocks.lookupMock.mockResolvedValue([{ address: '192.168.1.5', family: 4 }])

    await expect(checkUrlSafety('https://example.com')).resolves.toEqual({
      safe: false,
      reason: 'private_network',
    })
  })

  it('allows public resolved ip', async () => {
    mocks.lookupMock.mockResolvedValue([{ address: '1.1.1.1', family: 4 }])

    await expect(checkUrlSafety('https://example.com')).resolves.toEqual({
      safe: true,
    })
  })
})

