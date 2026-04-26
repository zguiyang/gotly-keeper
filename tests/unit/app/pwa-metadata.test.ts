import { describe, expect, it } from 'vitest'

import { metadata, viewport } from '@/app/layout'
import manifest from '@/app/manifest'

describe('pwa metadata', () => {
  it('exports installable app manifest with root start url', () => {
    const result = manifest()

    expect(result.name).toBe('Gotly AI')
    expect(result.short_name).toBe('Gotly')
    expect(result.start_url).toBe('/')
    expect(result.display).toBe('standalone')
    expect(result.display_override).toEqual(['window-controls-overlay', 'standalone'])
    expect(result.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          src: '/icons/icon-192.png',
          sizes: '192x192',
          type: 'image/png',
        }),
        expect.objectContaining({
          src: '/icons/icon-512.png',
          sizes: '512x512',
          type: 'image/png',
        }),
      ])
    )
  })

  it('exposes root metadata and viewport for app installation surfaces', () => {
    expect(metadata.applicationName).toBe('Gotly AI')
    expect(metadata.manifest).toBe('/manifest.webmanifest')

    const appleWebApp = metadata.appleWebApp
    expect(typeof appleWebApp).toBe('object')

    if (appleWebApp && typeof appleWebApp === 'object') {
      expect(appleWebApp.capable).toBe(true)
      expect(appleWebApp.title).toBe('Gotly AI')
    }

    expect(viewport.themeColor).toEqual([
      { media: '(prefers-color-scheme: light)', color: '#f7f9fb' },
      { media: '(prefers-color-scheme: dark)', color: '#111417' },
    ])
  })
})
