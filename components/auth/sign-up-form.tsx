'use client'

import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

import { AuthField } from '@/components/auth/auth-field'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldContent, FieldLabel } from '@/components/ui/field'
import { useAuthSubmit } from '@/hooks/auth/use-auth-submit'
import { authClient } from '@/lib/auth-client'

export function SignUpForm() {
  const { error, pending, onSubmit } = useAuthSubmit({
    fallbackErrorMessage: '注册失败，请稍后重试',
    parse: (formData) => {
      const name = String(formData.get('name') ?? '').trim()
      const email = String(formData.get('email') ?? '')
      const password = String(formData.get('password') ?? '')
      const terms = formData.get('terms')

      if (!terms) {
        return {
          ok: false,
          error: '请同意服务协议和隐私政策',
        }
      }

      if (!name) {
        return {
          ok: false,
          error: '请输入昵称',
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
        inputClassName="bg-surface-container-low focus:bg-surface-container-lowest"
        label="昵称"
        name="name"
        placeholder="例如：Joy"
        required
        spellCheck={false}
      />
      <AuthField
        autoComplete="email"
        inputClassName="bg-surface-container-low focus:bg-surface-container-lowest"
        label="电子邮箱"
        name="email"
        placeholder="name@example.com"
        required
        spellCheck={false}
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

      <Field orientation="horizontal" className="px-1">
        <Checkbox
          id="terms"
          name="terms"
          className="mt-1"
        />
        <FieldContent>
          <FieldLabel className="text-sm leading-snug text-on-surface-variant" htmlFor="terms">
            我同意{' '}
            <Link className="font-medium text-primary hover:underline" href="/terms">
              服务协议
            </Link>{' '}
            与{' '}
            <Link className="font-medium text-primary hover:underline" href="/privacy">
              隐私政策
            </Link>
          </FieldLabel>
        </FieldContent>
      </Field>

      {error && (
        <div className="rounded-md bg-error/10 px-4 py-3 text-sm text-error" aria-live="polite">
          {error}
        </div>
      )}

      <Button
        className="h-12 w-full gap-2 text-base"
        disabled={pending}
        type="submit"
      >
        <span>{pending ? '创建中…' : '创建账号'}</span>
        {!pending && <ArrowRight className="h-5 w-5" />}
      </Button>
    </form>
  )
}
