'use client'

import Link from 'next/link'

import { AuthField } from '@/components/auth/auth-field'
import { Button } from '@/components/ui/button'
import { useAuthSubmit } from '@/hooks/auth/use-auth-submit'
import { authClient } from '@/lib/auth-client'

export function SignInForm() {
  const { error, pending, onSubmit } = useAuthSubmit({
    fallbackErrorMessage: '登录失败，请检查邮箱和密码',
    parse: (formData) => ({
      ok: true,
      payload: {
        email: String(formData.get('email') ?? ''),
        password: String(formData.get('password') ?? ''),
      },
    }),
    submit: (payload) => authClient.signIn.email(payload),
  })

  return (
    <form className="space-y-6" onSubmit={onSubmit}>
      <AuthField
        autoComplete="email"
        label="EMAIL"
        name="email"
        placeholder="name@example.com"
        required
        spellCheck={false}
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
        <div className="rounded-md bg-error/10 px-4 py-3 text-sm text-error" aria-live="polite">
          {error}
        </div>
      )}

      <Button
        className="h-12 w-full text-base"
        disabled={pending}
        type="submit"
      >
        {pending ? '登录中…' : '立即登录'}
      </Button>
    </form>
  )
}
