'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'

import { authClient } from '@/lib/auth-client'
import { AuthField } from '@/components/auth/auth-field'
import { Button } from '@/components/ui/button'

export function SignUpForm() {
  const router = useRouter()
  const [error, setError] = React.useState<string | null>(null)
  const [pending, setPending] = React.useState(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setPending(true)

    const formData = new FormData(event.currentTarget)
    const name = String(formData.get('name') ?? '')
    const email = String(formData.get('email') ?? '')
    const password = String(formData.get('password') ?? '')
    const terms = formData.get('terms')

    if (!terms) {
      setError('请同意服务协议和隐私政策')
      setPending(false)
      return
    }

    const result = await authClient.signUp.email({ name, email, password })

    setPending(false)

    if (result.error) {
      setError(result.error.message ?? '注册失败，请稍后重试')
      return
    }

    router.replace('/workspace')
    router.refresh()
  }

  return (
    <form className="space-y-6" onSubmit={onSubmit}>
      <AuthField
        autoComplete="username"
        inputClassName="bg-surface-container-low focus:bg-surface-container-lowest"
        label="用户名"
        name="name"
        placeholder="输入您的灵感代号"
        required
      />
      <AuthField
        autoComplete="email"
        inputClassName="bg-surface-container-low focus:bg-surface-container-lowest"
        label="电子邮箱"
        name="email"
        placeholder="name@example.com"
        required
        type="email"
      />
      <AuthField
        autoComplete="new-password"
        inputClassName="bg-surface-container-low focus:bg-surface-container-lowest"
        label="密码"
        name="password"
        placeholder="••••••••"
        required
        type="password"
      />

      <div className="flex items-start gap-3 px-1">
        <input
          className="mt-1 h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary/20"
          id="terms"
          name="terms"
          type="checkbox"
        />
        <label className="text-sm leading-snug text-on-surface-variant" htmlFor="terms">
          我同意{' '}
          <Link className="font-medium text-primary hover:underline" href="/terms">
            服务协议
          </Link>{' '}
          与{' '}
          <Link className="font-medium text-primary hover:underline" href="/privacy">
            隐私政策
          </Link>
        </label>
      </div>

      {error && (
        <div className="rounded-md bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      <Button
        className="w-full gap-2 text-white"
        disabled={pending}
        size="xl"
        type="submit"
        variant="primary"
      >
        <span>{pending ? '创建中...' : '创建账号'}</span>
        {!pending && <ArrowRight className="h-5 w-5" />}
      </Button>
    </form>
  )
}