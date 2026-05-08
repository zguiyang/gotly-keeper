'use client'

import { ArrowRight, LoaderCircle } from 'lucide-react'

import { AuthField } from '@/components/auth/auth-field'
import { Button } from '@/components/ui/button'
import { useAuthSubmit } from '@/hooks/auth/use-auth-submit'
import { authClient } from '@/lib/auth-client'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function SignUpForm() {
  const { error, pending, onSubmit } = useAuthSubmit({
    fallbackErrorMessage: '注册失败，请稍后重试',
    parse: (formData) => {
      const name = String(formData.get('name') ?? '').trim()
      const email = String(formData.get('email') ?? '').trim()
      const password = String(formData.get('password') ?? '')

      if (!name) {
        return {
          ok: false,
          error: '请输入昵称',
        }
      }

      if (!email) {
        return {
          ok: false,
          error: '请输入电子邮箱',
        }
      }

      if (!EMAIL_REGEX.test(email)) {
        return {
          ok: false,
          error: '请输入有效的电子邮箱地址',
        }
      }

      if (!password) {
        return {
          ok: false,
          error: '请输入密码',
        }
      }

      if (password.length < 8) {
        return {
          ok: false,
          error: '密码长度至少为 8 个字符',
        }
      }

      return {
        ok: true,
        payload: { name, email, password },
      }
    },
    submit: (payload) => authClient.signUp.email(payload),
  })

  return (
    <form className="space-y-6" onSubmit={onSubmit}>
      <AuthField
        autoComplete="username"
        label="昵称"
        name="name"
        placeholder="例如：Joy"
        required
        spellCheck={false}
      />
      <AuthField
        autoComplete="email"
        label="电子邮箱"
        name="email"
        placeholder="name@example.com"
        required
        spellCheck={false}
        type="email"
      />
      <AuthField
        autoComplete="new-password"
        label="密码"
        name="password"
        placeholder="••••••••"
        required
        type="password"
      />

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
        {pending && <LoaderCircle className="size-4 animate-spin" />}
        <span>{pending ? '创建中…' : '创建账号'}</span>
        {!pending && <ArrowRight className="size-4" />}
      </Button>
    </form>
  )
}
