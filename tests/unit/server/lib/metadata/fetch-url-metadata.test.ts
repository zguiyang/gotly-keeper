import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchUrlMetadata } from '@/server/lib/metadata/fetch-url-metadata'

const mocks = vi.hoisted(() => ({
  checkUrlSafety: vi.fn(),
}))

vi.mock('@/server/lib/network/url-safety', () => ({
  checkUrlSafety: mocks.checkUrlSafety,
}))

describe('fetchUrlMetadata', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.checkUrlSafety.mockResolvedValue({ safe: true })
  })

  it('extracts metadata from html documents', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        '<html><head><title>Example</title><meta name="description" content="Desc"><link rel="icon" href="/favicon.ico"></head></html>',
        {
          status: 200,
          headers: {
            'content-type': 'text/html; charset=utf-8',
          },
        }
      )
    )

    await expect(fetchUrlMetadata('https://example.com/article')).resolves.toEqual({
      finalUrl: 'https://example.com/article',
      title: 'Example',
      description: 'Desc',
      icon: 'https://example.com/favicon.ico',
    })
  })

  it('re-validates redirect targets before continuing', async () => {
    mocks.checkUrlSafety
      .mockResolvedValueOnce({ safe: true })
      .mockResolvedValueOnce({ safe: false, reason: 'private_network' })

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: {
          location: 'http://localhost/internal',
        },
      })
    )

    await expect(fetchUrlMetadata('https://example.com')).rejects.toThrow('PRIVATE_URL_BLOCKED')
  })

  it('rejects oversized html responses', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('<html>' + 'a'.repeat(300_000) + '</html>', {
        status: 200,
        headers: {
          'content-type': 'text/html; charset=utf-8',
        },
      })
    )

    await expect(fetchUrlMetadata('https://example.com')).rejects.toThrow('FETCH_TOO_LARGE')
  })
})
