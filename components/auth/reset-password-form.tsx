'use client'

import { ArrowLeft, CheckCircle, LoaderCircle, Lock, TriangleAlert } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useState, type FormEvent } from 'react'

import { AuthCard, AuthHeader, AuthStatusView } from '@/components/auth/auth-card'
import { AuthField } from '@/components/auth/auth-field'
import { AuthPageScaffold } from '@/components/auth/auth-page-scaffold'
import { Button, buttonVariants } from '@/components/ui/button'
import { useTranslations } from '@/hooks/use-locale'
import { authClient } from '@/lib/auth-client'
import { cn } from '@/lib/utils'

export function ResetPasswordForm() {
  const t = useTranslations('auth.resetPassword')
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const errorParam = searchParams.get('error')

  const [error, setError] = useState<string | null>(
    errorParam === 'INVALID_TOKEN' ? t('tokenExpired') : null
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
      setError(t('validation.passwordRequired'))
      setPending(false)
      return
    }

    if (newPassword.length < 8) {
      setError(t('validation.passwordMinLength'))
      setPending(false)
      return
    }

    if (newPassword !== confirmPassword) {
      setError(t('validation.passwordMismatch'))
      setPending(false)
      return
    }

    try {
      const { error: resultError } = await authClient.resetPassword({
        newPassword,
        token: token ?? '',
      })

      if (resultError) {
        setError(resultError.message ?? t('fallbackError'))
        return
      }

      setReset(true)
    } catch {
      setError(t('fallbackError'))
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
          title={t('invalidLink')}
          description={t('invalidLinkDescription')}
          icon={<TriangleAlert className="size-7" strokeWidth={1.8} />}
          action={
            <Link
              className={cn(buttonVariants({ size: 'lg' }), 'h-10 w-full rounded-xl text-sm')}
              href="/auth/forgot-password"
            >
              {t('requestAgain')}
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
          title={t('successTitle')}
          description={t('successDescription')}
          icon={<CheckCircle className="size-7" strokeWidth={1.8} />}
          action={
            <Link
              className={cn(buttonVariants({ size: 'lg' }), 'h-10 w-full rounded-xl text-sm')}
              href="/auth/sign-in"
            >
              {t('goToSignIn')}
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
        <AuthHeader title={t('title')} description={t('description')} />

        <form className="space-y-6" onSubmit={handleSubmit}>
          <AuthField
            autoComplete="new-password"
            label={t('newPasswordLabel')}
            name="password"
            placeholder={t('newPasswordPlaceholder')}
            prefixIcon={<Lock className="size-4" />}
            required
            type="password"
          />

          <AuthField
            autoComplete="new-password"
            label={t('confirmPasswordLabel')}
            name="confirmPassword"
            placeholder={t('confirmPasswordPlaceholder')}
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
            {pending ? t('submittingLabel') : t('submitLabel')}
          </Button>

          <div className="flex flex-col items-center pt-1">
            <Link
              className="group flex items-center gap-2 text-sm font-semibold text-primary transition-colors duration-150 hover:text-primary-dim"
              href="/auth/sign-in"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>{t('backToSignIn')}</span>
            </Link>
          </div>
        </form>
      </AuthCard>
    </AuthPageScaffold>
  )
}
