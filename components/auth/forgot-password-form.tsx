'use client'

import { ArrowLeft, CheckCircle, Mail } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'

import { AuthField } from '@/components/auth/auth-field'
import { AuthPageScaffold } from '@/components/auth/auth-page-scaffold'
import { Button } from '@/components/ui/button'
import { authClient } from '@/lib/auth-client'

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
        mainClassName="relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-6"
        withFooter={false}
      >
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -right-24 -bottom-24 h-96 w-96 rounded-full bg-primary-container/16 blur-3xl" />

        <div className="relative z-10 w-full max-w-[420px] text-center">
          <div className="mb-10 flex justify-center">
            <div
              className="flex h-24 w-24 items-center justify-center rounded-full bg-surface-container-lowest shadow-[var(--shadow-soft)]"
              style={{ filter: "drop-shadow(0 0 15px color-mix(in srgb, var(--color-primary) 15%, transparent))" }}
            >
              <CheckCircle className="h-14 w-14 text-primary" strokeWidth={1.5} />
            </div>
          </div>

          <h1 className="mb-4 font-headline text-3xl font-bold tracking-tight text-on-surface">链接已发送</h1>
          <p className="mb-12 font-body leading-relaxed text-secondary">
            重置密码链接已发送至你的邮箱，请注意查收。
          </p>

          <div className="space-y-4">
            <Link
              className="block w-full rounded-full bg-gradient-to-r from-primary to-primary-container px-6 py-4 text-center font-semibold text-primary-foreground shadow-lg shadow-primary/10 transition-[transform,opacity,box-shadow] duration-200 hover:opacity-90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              href="/auth/sign-in"
            >
              回到登录
            </Link>
          </div>
        </div>

        <div className="absolute bottom-12 w-full text-center">
          <p className="font-label text-xs uppercase tracking-wide text-secondary opacity-70">
            Gotly Keeper • The Digital Curator
          </p>
        </div>
      </AuthPageScaffold>
    )
  }

  return (
    <AuthPageScaffold contentClassName="w-full max-w-md" mainClassName="flex flex-1 items-center justify-center px-6">
      <div className="mb-10 text-left">
        <h1 className="mb-3 text-4xl font-extrabold tracking-tight text-on-surface">找回密码</h1>
        <p className="font-medium leading-relaxed text-on-surface-variant">
          请输入你的注册邮箱，我们将为你发送验证链接
        </p>
      </div>

      <form className="space-y-8" onSubmit={handleSubmit}>
        <AuthField
          autoComplete="email"
          inputClassName="py-4"
          label="EMAIL"
          name="email"
          placeholder="your@email.com"
          prefixIcon={<Mail className="text-lg" />}
          spellCheck={false}
          type="email"
        />

        {error && (
          <div className="rounded-md bg-error/10 px-4 py-3 text-sm text-error" aria-live="polite">
            {error}
          </div>
        )}

        <Button
          className="h-12 w-full rounded-full text-base"
          disabled={pending}
          type="submit"
        >
          {pending ? '发送中…' : '发送验证链接'}
        </Button>

        <div className="flex flex-col items-center pt-4">
          <Link
            className="group flex items-center gap-2 text-sm font-semibold text-primary transition-opacity hover:opacity-80"
            href="/auth/sign-in"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>返回登录</span>
          </Link>
        </div>
      </form>
    </AuthPageScaffold>
  )
}
