'use client'

import { ArrowLeft, CheckCircle, LoaderCircle, Mail } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'

import { AuthCard, AuthHeader, AuthStatusView } from '@/components/auth/auth-card'
import { AuthField } from '@/components/auth/auth-field'
import { AuthPageScaffold } from '@/components/auth/auth-page-scaffold'
import { Button, buttonVariants } from '@/components/ui/button'
import { authClient } from '@/lib/auth-client'
import { cn } from '@/lib/utils'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function ForgotPasswordForm() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setPending(true)

    const formData = new FormData(event.currentTarget)
    const email = String(formData.get('email') ?? '').trim()

    if (!email) {
      setError('请输入电子邮箱')
      setPending(false)
      return
    }

    if (!EMAIL_REGEX.test(email)) {
      setError('请输入有效的电子邮箱地址')
      setPending(false)
      return
    }

    try {
      const { error: resultError } = await authClient.requestPasswordReset({
        email,
        redirectTo: '/auth/reset-password',
      })

      if (resultError) {
        setError(resultError.message ?? '发送失败，请稍后重试')
        return
      }

      setSent(true)
      router.replace('/auth/reset-link-sent')
    } catch {
      setError('发送失败，请稍后重试')
    } finally {
      setPending(false)
    }
  }

  if (sent) {
    return (
      <AuthPageScaffold
        mainClassName="flex flex-1 items-center justify-center px-6 py-12 sm:py-16"
        withFooter={false}
      >
        <AuthStatusView
          title="链接已发送"
          description="重置密码链接已发送至你的邮箱，请注意查收。"
          icon={<CheckCircle className="size-7" strokeWidth={1.8} />}
          action={
            <Link
              className={cn(buttonVariants({ size: 'lg' }), 'h-10 w-full rounded-xl text-sm')}
              href="/auth/sign-in"
            >
              回到登录
            </Link>
          }
        />
      </AuthPageScaffold>
    )
  }

  return (
    <AuthPageScaffold
      contentClassName="w-full max-w-[440px]"
      mainClassName="flex flex-1 items-center justify-center px-6 py-12 sm:py-16"
      withFooter={false}
    >
      <AuthCard>
        <AuthHeader title="找回密码" description="输入注册邮箱，我们会发送重置链接。" />

        <form className="space-y-6" onSubmit={handleSubmit}>
          <AuthField
            autoComplete="email"
            label="EMAIL"
            name="email"
            placeholder="your@email.com"
            prefixIcon={<Mail className="size-4" />}
            spellCheck={false}
            type="email"
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
            {pending ? <LoaderCircle className="size-4 animate-spin" /> : null}
            {pending ? '发送中…' : '发送验证链接'}
          </Button>

          <div className="flex flex-col items-center pt-1">
            <Link
              className="group flex items-center gap-2 text-sm font-semibold text-primary transition-colors duration-150 hover:text-primary-dim"
              href="/auth/sign-in"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>返回登录</span>
            </Link>
          </div>
        </form>
      </AuthCard>
    </AuthPageScaffold>
  )
}
