'use client'

import { useCallback, useState } from 'react'

import { Button } from '@/components/ui/button'
import { authClient } from '@/lib/auth-client'

interface SignInWithGithubButtonProps {
  label: string
}

export function SignInWithGithubButton({ label }: SignInWithGithubButtonProps) {
  const [pending, setPending] = useState(false)

  const handleClick = useCallback(async () => {
    setPending(true)
    const { error } = await authClient.signIn.social({
      provider: 'github',
      callbackURL: '/workspace',
    })
    if (error) {
      setPending(false)
    }
  }, [])

  return (
    <Button
      className="h-10 w-full gap-2 rounded-xl text-sm"
      type="button"
      variant="secondary"
      disabled={pending}
      onClick={handleClick}
    >
      <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 .5A12 12 0 0 0 8.2 23.9c.6.11.8-.26.8-.58v-2.1c-3.34.72-4.04-1.42-4.04-1.42-.55-1.38-1.34-1.75-1.34-1.75-1.08-.74.09-.73.09-.73 1.2.09 1.83 1.23 1.83 1.23 1.07 1.84 2.8 1.3 3.49 1 .1-.77.42-1.3.76-1.6-2.66-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.17 0 0 1.01-.32 3.3 1.23a11.6 11.6 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.65 1.65.24 2.87.12 3.17.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.62-5.49 5.92.44.38.83 1.11.83 2.24v3.31c0 .32.19.69.8.57A12 12 0 0 0 12 .5Z" />
      </svg>
      <span>{pending ? '跳转中…' : label}</span>
    </Button>
  )
}
