'use client'

import { ArrowRight, LoaderCircle } from 'lucide-react'

import { AuthField } from '@/components/auth/auth-field'
import { Button } from '@/components/ui/button'
import { useAuthSubmit } from '@/hooks/auth/use-auth-submit'
import { useTranslations } from '@/hooks/use-locale'
import { authClient } from '@/lib/auth-client'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function SignUpForm() {
  const t = useTranslations('auth.signUp')
  const tCommon = useTranslations('common.errors.auth')
  const { error, pending, onSubmit } = useAuthSubmit({
    fallbackErrorMessage: t('fallbackError'),
    parse: (formData) => {
      const name = String(formData.get('name') ?? '').trim()
      const email = String(formData.get('email') ?? '').trim()
      const password = String(formData.get('password') ?? '')

      if (!name) {
        return {
          ok: false,
          error: t('validation.nameRequired'),
        }
      }

      if (!email) {
        return {
          ok: false,
          error: t('validation.emailRequired'),
        }
      }

      if (!EMAIL_REGEX.test(email)) {
        return {
          ok: false,
          error: t('validation.emailInvalid'),
        }
      }

      if (!password) {
        return {
          ok: false,
          error: t('validation.passwordRequired'),
        }
      }

      if (password.length < 8) {
        return {
          ok: false,
          error: t('validation.passwordMinLength'),
        }
      }

      return {
        ok: true,
        payload: { name, email, password },
      }
    },
    submit: (payload) => authClient.signUp.email(payload),
    formatError: (code) => {
      const COMMON_KEY_MAP: Record<string, string> = {
        USER_ALREADY_EXISTS: 'emailTaken',
        USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: 'emailTaken',
        INVALID_EMAIL: 'invalidEmail',
        PASSWORD_TOO_SHORT: 'passwordMinLength',
      }
      const commonKey = COMMON_KEY_MAP[code]
      if (commonKey) return tCommon(commonKey)
      return null
    },
  })

  return (
    <form className="space-y-6" onSubmit={onSubmit}>
      <AuthField
        autoComplete="username"
        label={t('nameLabel')}
        name="name"
        placeholder={t('namePlaceholder')}
        required
        spellCheck={false}
      />
      <AuthField
        autoComplete="email"
        label={t('emailLabel')}
        name="email"
        placeholder={t('emailPlaceholder')}
        required
        spellCheck={false}
        type="email"
      />
      <AuthField
        autoComplete="new-password"
        label={t('passwordLabel')}
        name="password"
        placeholder={t('passwordPlaceholder')}
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
        <span>{pending ? t('submittingLabel') : t('submitLabel')}</span>
        {!pending && <ArrowRight className="size-4" />}
      </Button>
    </form>
  )
}
