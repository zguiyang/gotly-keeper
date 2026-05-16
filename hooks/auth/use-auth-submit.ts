'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useState, type FormEvent } from 'react'

const ERROR_MESSAGES: Record<string, string> = {
  USER_NOT_FOUND: '用户不存在',
  INVALID_PASSWORD: '密码错误',
  INVALID_EMAIL_OR_PASSWORD: '邮箱或密码错误',
  INVALID_EMAIL: '邮箱格式无效',
  USER_ALREADY_EXISTS: '邮箱已被注册',
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: '邮箱已被注册',
  FAILED_TO_CREATE_USER: '创建用户失败，请稍后重试',
  FAILED_TO_CREATE_SESSION: '创建会话失败，请稍后重试',
  PASSWORD_TOO_SHORT: '密码长度至少为 8 个字符',
  PASSWORD_TOO_LONG: '密码过长',
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
          setError(
            result.error.code
              ? (ERROR_MESSAGES[result.error.code] ?? result.error.message ?? fallbackErrorMessage)
              : (result.error.message ?? fallbackErrorMessage)
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
