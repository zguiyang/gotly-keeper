import Link from 'next/link'

import { buttonVariants } from '@/components/ui/button'
import { getServerTranslation } from '@/hooks/use-locale.server'
import { cn } from '@/lib/utils'

export default async function OfflinePage() {
  const t = await getServerTranslation('offline')

  return (
    <main className="flex min-h-screen min-h-dvh items-center justify-center bg-muted/20 px-6 py-16">
      <section className="w-full max-w-lg rounded-[2rem] border border-border/10 bg-background p-8 shadow-[var(--shadow-elevation-3)] sm:p-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/70">
          Offline
        </p>
        <h1 className="mt-4 font-headline text-3xl font-semibold tracking-[-0.02em] text-on-surface sm:text-[2.2rem]">
          {t('title')}
        </h1>
        <p className="mt-4 text-sm leading-7 text-on-surface-variant sm:text-[15px]">
          {t('description')}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/"
            className={cn(buttonVariants({ size: 'sm' }), 'rounded-full px-5')}
          >
            {t('backToHome')}
          </Link>
          <Link
            href="/auth/sign-in"
            className={cn(
              buttonVariants({ variant: 'outline', size: 'sm' }),
              'rounded-full px-5'
            )}
          >
            {t('signInAfterReconnect')}
          </Link>
        </div>
      </section>
    </main>
  )
}
