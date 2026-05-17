'use client'

import { LoaderCircle } from 'lucide-react'
import Link from 'next/link'

import { AuthField } from '@/components/auth/auth-field'
import { Button } from '@/components/ui/button'
import { useAuthSubmit } from '@/hooks/auth/use-auth-submit'
import { authClient } from '@/lib/auth-client'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function SignInForm() {
  const { error, pending, onSubmit } = useAuthSubmit({
    fallbackErrorMessage: '登录失败，请检查邮箱和密码',
    parse: (formData) => {
      const email = String(formData.get('email') ?? '').trim()
      const password = String(formData.get('password') ?? '')

      if (!email) {
        return { ok: false, error: '请输入电子邮箱' }
      }

      if (!EMAIL_REGEX.test(email)) {
        return { ok: false, error: '请输入有效的电子邮箱地址' }
      }

      if (!password) {
        return { ok: false, error: '请输入密码' }
      }

      return {
        ok: true,
        payload: { email, password },
      }
    },
    submit: (payload) => authClient.signIn.email(payload),
  })

  return (
    <form className="space-y-6" onSubmit={onSubmit}>
      <AuthField
        autoComplete="email"
        label="邮箱"
        name="email"
        placeholder="name@example.com"
        required
        spellCheck={false}
        type="email"
      />

      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <label
            className="block text-[12px] font-medium tracking-normal text-on-surface-variant/85"
            htmlFor="sign-in-password"
          >
            密码
          </label>
          <Link
            href="/auth/forgot-password"
            className="text-xs font-medium text-primary transition-colors duration-150 hover:text-primary-dim"
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
        <div className="rounded-xl border border-destructive/15 bg-destructive/[0.045] px-3.5 py-2.5 text-sm leading-5 text-destructive" aria-live="polite">
          {error}
        </div>
      )}

      <Button
        className="h-10 w-full gap-2 rounded-xl text-sm"
        disabled={pending}
        type="submit"
      >
        {pending ? <LoaderCircle className="size-4 animate-spin" /> : null}
        {pending ? '登录中…' : '立即登录'}
      </Button>
    </form>
  )
}
