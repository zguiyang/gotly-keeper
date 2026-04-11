'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { authClient } from '@/lib/auth-client'
import { AuthField } from '@/components/auth/auth-field'
import { Button } from '@/components/ui/button'

export function SignInForm() {
  const router = useRouter()
  const [error, setError] = React.useState<string | null>(null)
  const [pending, setPending] = React.useState(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setPending(true)

    const formData = new FormData(event.currentTarget)
    const email = String(formData.get('email') ?? '')
    const password = String(formData.get('password') ?? '')

    const result = await authClient.signIn.email({ email, password })

    setPending(false)

    if (result.error) {
      setError(result.error.message ?? '登录失败，请检查邮箱和密码')
      return
    }

    router.replace('/workspace')
    router.refresh()
  }

  return (
    <form className="space-y-6" onSubmit={onSubmit}>
      <AuthField
        autoComplete="email"
        label="EMAIL"
        name="email"
        placeholder="name@example.com"
        required
        type="email"
      />

      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <label
            className="block text-xs font-semibold uppercase tracking-[0.22em] text-on-surface-variant"
            htmlFor="sign-in-password"
          >
            PASSWORD
          </label>
          <Link
            href="/auth/forgot-password"
            className="text-xs font-medium text-primary transition-colors hover:text-primary-container"
          >
            忘记密码
          </Link>
        </div>
        <AuthField
          id="sign-in-password"
          autoComplete="current-password"
          containerClassName="space-y-0"
          labelClassName="sr-only"
          name="password"
          placeholder="••••••••"
          required
          type="password"
        />
      </div>

      {error && (
        <div className="rounded-md bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      <Button
        className="w-full text-white"
        disabled={pending}
        size="xl"
        type="submit"
        variant="primary"
      >
        {pending ? '登录中...' : '立即登录'}
      </Button>
    </form>
  )
}