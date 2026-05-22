'use client'

import { LoaderCircle } from 'lucide-react'
import Link from 'next/link'

import { AuthField } from '@/components/auth/auth-field'
import { Button } from '@/components/ui/button'
import { useAuthSubmit } from '@/hooks/auth/use-auth-submit'
import { useTranslations } from '@/hooks/use-locale'
import { authClient } from '@/lib/auth-client'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function SignInForm() {
  const t = useTranslations('auth.signIn')
  const tCommon = useTranslations('common.errors.auth')
  const { error, pending, onSubmit } = useAuthSubmit({
    fallbackErrorMessage: t('fallbackError'),
    parse: (formData) => {
      const email = String(formData.get('email') ?? '').trim()
      const password = String(formData.get('password') ?? '')

      if (!email) {
        return { ok: false, error: t('validation.emailRequired') }
      }

      if (!EMAIL_REGEX.test(email)) {
        return { ok: false, error: t('validation.emailInvalid') }
      }

      if (!password) {
        return { ok: false, error: t('validation.passwordRequired') }
      }

      return {
        ok: true,
        payload: { email, password },
      }
    },
    submit: (payload) => authClient.signIn.email(payload),
    formatError: (code) => {
      const COMMON_KEY_MAP: Record<string, string> = {
        USER_NOT_FOUND: 'userNotFound',
        INVALID_PASSWORD: 'wrongPassword',
        INVALID_EMAIL_OR_PASSWORD: 'invalidEmail',
        INVALID_EMAIL_OR_PASSWORD_OR_USER_NOT_FOUND: 'invalidEmail',
        INVALID_EMAIL: 'invalidEmail',
      }
      const commonKey = COMMON_KEY_MAP[code]
      if (commonKey) return tCommon(commonKey)
      return null
    },
  })

  return (
    <form className="space-y-6" onSubmit={onSubmit}>
      <AuthField
        autoComplete="email"
        label={t('emailLabel')}
        name="email"
        placeholder={t('emailPlaceholder')}
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
            {t('passwordLabel')}
          </label>
          <Link
            href="/auth/forgot-password"
            className="text-xs font-medium text-primary transition-colors duration-150 hover:text-primary-dim"
          >
            {t('forgotPassword')}
          </Link>
        </div>
        <AuthField
          id="sign-in-password"
          autoComplete="current-password"
          containerClassName="space-y-0"
          labelClassName="sr-only"
          name="password"
          placeholder={t('passwordPlaceholder')}
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
        {pending ? t('submittingLabel') : t('submitLabel')}
      </Button>
    </form>
  )
}
