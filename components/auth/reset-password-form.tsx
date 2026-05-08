'use client'

import { ArrowLeft, CheckCircle, LoaderCircle, Lock, TriangleAlert } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useState, type FormEvent } from 'react'

import { AuthCard, AuthHeader, AuthStatusView } from '@/components/auth/auth-card'
import { AuthField } from '@/components/auth/auth-field'
import { AuthPageScaffold } from '@/components/auth/auth-page-scaffold'
import { Button, buttonVariants } from '@/components/ui/button'
import { authClient } from '@/lib/auth-client'
import { cn } from '@/lib/utils'

export function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const errorParam = searchParams.get('error')

  const [error, setError] = useState<string | null>(
    errorParam === 'INVALID_TOKEN' ? '链接已过期，请重新申请' : null
  )
  const [pending, setPending] = useState(false)
  const [reset, setReset] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setPending(true)

    const formData = new FormData(event.currentTarget)
    const newPassword = String(formData.get('password') ?? '')
    const confirmPassword = String(formData.get('confirmPassword') ?? '')

    if (!newPassword) {
      setError('请输入新密码')
      setPending(false)
      return
    }

    if (newPassword.length < 8) {
      setError('密码长度至少为 8 个字符')
      setPending(false)
      return
    }

    if (newPassword !== confirmPassword) {
      setError('两次输入的密码不一致')
      setPending(false)
      return
    }

    try {
      const { error: resultError } = await authClient.resetPassword({
        newPassword,
        token: token ?? '',
      })

      if (resultError) {
        setError(resultError.message ?? '重置失败，请稍后重试')
        return
      }

      setReset(true)
    } catch {
      setError('重置失败，请稍后重试')
    } finally {
      setPending(false)
    }
  }

  if (!token && !errorParam) {
    return (
      <AuthPageScaffold
        mainClassName="flex flex-1 items-center justify-center px-6 py-12 sm:py-16"
        withFooter={false}
      >
        <AuthStatusView
          title="无效链接"
          description="重置密码链接无效，请重新申请。"
          icon={<TriangleAlert className="size-7" strokeWidth={1.8} />}
          action={
            <Link
              className={cn(buttonVariants({ size: 'lg' }), 'h-10 w-full rounded-xl text-sm')}
              href="/auth/forgot-password"
            >
              重新申请
            </Link>
          }
        />
      </AuthPageScaffold>
    )
  }

  if (reset) {
    return (
      <AuthPageScaffold
        mainClassName="flex flex-1 items-center justify-center px-6 py-12 sm:py-16"
        withFooter={false}
      >
        <AuthStatusView
          title="密码已重置"
          description="你的密码已成功重置，请用新密码登录。"
          icon={<CheckCircle className="size-7" strokeWidth={1.8} />}
          action={
            <Link
              className={cn(buttonVariants({ size: 'lg' }), 'h-10 w-full rounded-xl text-sm')}
              href="/auth/sign-in"
            >
              去登录
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
        <AuthHeader title="设置新密码" description="请输入你的新密码。" />

        <form className="space-y-6" onSubmit={handleSubmit}>
          <AuthField
            autoComplete="new-password"
            label="新密码"
            name="password"
            placeholder="••••••••"
            prefixIcon={<Lock className="size-4" />}
            required
            type="password"
          />

          <AuthField
            autoComplete="new-password"
            label="确认密码"
            name="confirmPassword"
            placeholder="再次输入新密码"
            prefixIcon={<Lock className="size-4" />}
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
            {pending ? <LoaderCircle className="size-4 animate-spin" /> : null}
            {pending ? '重置中…' : '重置密码'}
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
