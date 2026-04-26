// @vitest-environment jsdom

import { render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { PwaRegister } from '@/components/pwa/pwa-register'

describe('PwaRegister', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('registers the service worker on secure contexts', async () => {
    const register = vi.fn().mockResolvedValue(undefined)

    vi.stubEnv('NODE_ENV', 'production')
    vi.stubGlobal('navigator', {
      serviceWorker: { register },
    })
    vi.stubGlobal('window', Object.assign(window, { isSecureContext: true }))

    render(<PwaRegister />)

    await waitFor(() => {
      expect(register).toHaveBeenCalledWith('/sw.js')
    })
  })

  it('skips registration outside production builds', async () => {
    const register = vi.fn().mockResolvedValue(undefined)

    vi.stubEnv('NODE_ENV', 'development')
    vi.stubGlobal('navigator', {
      serviceWorker: { register },
    })
    vi.stubGlobal('window', Object.assign(window, { isSecureContext: true }))

    render(<PwaRegister />)

    await waitFor(() => {
      expect(register).not.toHaveBeenCalled()
    })
  })
})
