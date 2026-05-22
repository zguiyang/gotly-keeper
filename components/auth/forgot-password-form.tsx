'use client'

import { ArrowLeft, CheckCircle, LoaderCircle, Mail } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'

import { AuthCard, AuthHeader, AuthStatusView } from '@/components/auth/auth-card'
import { AuthField } from '@/components/auth/auth-field'
import { AuthPageScaffold } from '@/components/auth/auth-page-scaffold'
import { Button, buttonVariants } from '@/components/ui/button'
import { useTranslations } from '@/hooks/use-locale'
import { authClient } from '@/lib/auth-client'
import { cn } from '@/lib/utils'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function ForgotPasswordForm() {
  const t = useTranslations('auth.forgotPassword')
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
      setError(t('validation.emailRequired'))
      setPending(false)
      return
    }

    if (!EMAIL_REGEX.test(email)) {
      setError(t('validation.emailInvalid'))
      setPending(false)
      return
    }

    try {
      const { error: resultError } = await authClient.requestPasswordReset({
        email,
        redirectTo: '/auth/reset-password',
      })

      if (resultError) {
        setError(resultError.message ?? t('fallbackError'))
        return
      }

      setSent(true)
      router.replace('/auth/reset-link-sent')
    } catch {
      setError(t('fallbackError'))
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
          title={t('sentTitle')}
          description={t('sentDescription')}
          icon={<CheckCircle className="size-7" strokeWidth={1.8} />}
          action={
            <Link
              className={cn(buttonVariants({ size: 'lg' }), 'h-10 w-full rounded-xl text-sm')}
              href="/auth/sign-in"
            >
              {t('backToSignIn')}
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
            autoComplete="email"
            label={t('emailLabel')}
            name="email"
            placeholder={t('emailPlaceholder')}
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
