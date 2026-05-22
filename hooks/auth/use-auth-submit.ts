'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useState, type FormEvent } from 'react'

const ERROR_MESSAGES: Record<string, string> = {
  USER_NOT_FOUND: 'User not found',
  INVALID_PASSWORD: 'Invalid password',
  INVALID_EMAIL_OR_PASSWORD: 'Invalid email or password',
  INVALID_EMAIL: 'Invalid email format',
  USER_ALREADY_EXISTS: 'Email already registered',
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: 'Email already registered',
  FAILED_TO_CREATE_USER: 'Failed to create user. Please try again.',
  FAILED_TO_CREATE_SESSION: 'Failed to create session. Please try again.',
  PASSWORD_TOO_SHORT: 'Password must be at least 8 characters',
  PASSWORD_TOO_LONG: 'Password is too long',
  INVALID_EMAIL_OR_PASSWORD_OR_USER_NOT_FOUND: 'Invalid email or password',
}

type AuthSubmitError = {
  code?: string
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
  formatError?: (code: string) => string | null
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
  formatError,
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
          const translated = result.error.code ? formatError?.(result.error.code) : null
          setError(
            translated ??
              (result.error.code
                ? (ERROR_MESSAGES[result.error.code] ?? result.error.message ?? fallbackErrorMessage)
                : (result.error.message ?? fallbackErrorMessage))
          )
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
