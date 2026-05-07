'use client'

import { ArrowLeft, Lock } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, type FormEvent } from 'react'

import { AuthField } from '@/components/auth/auth-field'
import { AuthPageScaffold } from '@/components/auth/auth-page-scaffold'
import { Button } from '@/components/ui/button'
import { authClient } from '@/lib/auth-client'

export function ResetPasswordForm() {
  const router = useRouter()
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
      <AuthPageScaffold contentClassName="w-full max-w-md" mainClassName="flex flex-1 items-center justify-center px-6">
        <div className="text-center">
          <h1 className="mb-3 text-4xl font-extrabold tracking-tight text-on-surface">无效链接</h1>
          <p className="mb-8 font-medium leading-relaxed text-on-surface-variant">重置密码链接无效，请重新申请。</p>
          <Link
            className="inline-block rounded-full bg-gradient-to-r from-primary to-primary-container px-6 py-4 text-center font-semibold text-primary-foreground shadow-lg shadow-primary/10 transition-[transform,opacity,box-shadow] duration-200 hover:opacity-90 active:scale-[0.98]"
            href="/auth/forgot-password"
          >
            重新申请
          </Link>
        </div>
      </AuthPageScaffold>
    )
  }

  if (reset) {
    return (
      <AuthPageScaffold contentClassName="w-full max-w-md" mainClassName="flex flex-1 items-center justify-center px-6">
        <div className="text-center">
          <h1 className="mb-3 text-4xl font-extrabold tracking-tight text-on-surface">密码已重置</h1>
          <p className="mb-8 font-medium leading-relaxed text-on-surface-variant">你的密码已成功重置，请用新密码登录。</p>
          <Link
            className="inline-block rounded-full bg-gradient-to-r from-primary to-primary-container px-6 py-4 text-center font-semibold text-primary-foreground shadow-lg shadow-primary/10 transition-[transform,opacity,box-shadow] duration-200 hover:opacity-90 active:scale-[0.98]"
            href="/auth/sign-in"
          >
            去登录
          </Link>
        </div>
      </AuthPageScaffold>
    )
  }

  return (
    <AuthPageScaffold contentClassName="w-full max-w-md" mainClassName="flex flex-1 items-center justify-center px-6">
      <div className="mb-10 text-left">
        <h1 className="mb-3 text-4xl font-extrabold tracking-tight text-on-surface">设置新密码</h1>
        <p className="font-medium leading-relaxed text-on-surface-variant">请输入你的新密码</p>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit}>
        <AuthField
          autoComplete="new-password"
          inputClassName="py-4"
          label="新密码"
          name="password"
          placeholder="••••••••"
          prefixIcon={<Lock className="text-lg" />}
          required
          type="password"
        />

        <AuthField
          autoComplete="new-password"
          inputClassName="py-4"
          label="确认密码"
          name="confirmPassword"
          placeholder="再次输入新密码"
          prefixIcon={<Lock className="text-lg" />}
          required
          type="password"
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
          {pending ? '重置中…' : '重置密码'}
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
