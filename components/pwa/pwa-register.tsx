'use client'

import { useEffect } from 'react'

function canRegisterServiceWorker() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false
  }

  if (!('serviceWorker' in navigator)) {
    return false
  }

  return (
    window.isSecureContext ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  )
}

export function PwaRegister() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return
    }

    if (process.env.NODE_ENV !== 'production') {
      if (typeof navigator.serviceWorker.getRegistrations === 'function') {
        void navigator.serviceWorker
          .getRegistrations()
          .then((registrations) => {
            return Promise.all(registrations.map((registration) => registration.unregister()))
          })
          .catch(() => undefined)
      }
      return
    }

    if (!canRegisterServiceWorker()) {
      return
    }

    void navigator.serviceWorker.register('/sw.js').catch((error: unknown) => {
      console.warn('PWA registration failed', error)
    })
  }, [])

  return null
}
