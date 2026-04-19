'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useState, type FormEvent } from 'react'

type AuthSubmitError = {
  message?: string | null
}

type AuthSubmitResult = {
  error?: AuthSubmitError | null
}

type ParseResult<TPayload> =
  | {
      ok: true
      payload: TPayload
    }
  | {
      ok: false
      error: string
    }

interface UseAuthSubmitOptions<TPayload> {
  fallbackErrorMessage: string
  parse: (formData: FormData) => ParseResult<TPayload>
  submit: (payload: TPayload) => Promise<AuthSubmitResult>
}

interface UseAuthSubmitReturn {
  error: string | null
  pending: boolean
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>
}

export function useAuthSubmit<TPayload>({
  fallbackErrorMessage,
  parse,
  submit,
}: UseAuthSubmitOptions<TPayload>): UseAuthSubmitReturn {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const onSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      setError(null)
      setPending(true)

      const formData = new FormData(event.currentTarget)
      const parsed = parse(formData)

      if (!parsed.ok) {
        setError(parsed.error)
        setPending(false)
        return
      }

      try {
        const result = await submit(parsed.payload)

        if (result.error) {
          setError(result.error.message ?? fallbackErrorMessage)
          return
        }

        router.replace('/workspace')
        router.refresh()
      } catch {
        setError(fallbackErrorMessage)
      } finally {
        setPending(false)
      }
    },
    [fallbackErrorMessage, parse, router, submit]
  )

  return {
    error,
    pending,
    onSubmit,
  }
}
