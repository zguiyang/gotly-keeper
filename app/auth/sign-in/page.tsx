import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthNavbar } from "@/components/auth/auth-navbar";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthDivider } from "@/components/auth/auth-divider";
import { AuthField } from "@/components/auth/auth-field";
import { AuthPageFooter } from "@/components/auth/auth-footer";
import { Button } from "@/components/ui/button";

export default function SignInPage() {
  return (
    <AuthShell>
      <AuthNavbar />

      <main className="flex flex-1 items-center justify-center px-6 pt-24 pb-12">
        <div className="w-full max-w-[440px]">
          <AuthCard className="relative overflow-hidden">
            <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-primary-fixed-dim/20 blur-3xl" />
            <div className="relative z-10">
              <div className="mb-10 text-center">
                <h1 className="font-headline mb-3 text-3xl font-bold tracking-tight text-on-surface">
                  欢迎回来
                </h1>
                <p className="text-sm leading-relaxed text-secondary">
                  登录 Gotly AI 以继续管理你的灵感
                </p>
              </div>

              <form className="space-y-6">
                <AuthField
                  autoComplete="email"
                  label="EMAIL"
                  placeholder="name@example.com"
                />

                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <label
                      className="block text-xs font-semibold uppercase tracking-[0.22em] text-on-surface-variant"
                      htmlFor="sign-in-password"
                    >
                      PASSWORD
                    </label>
                    <Link
                      href="/auth/forgot-password"
                      className="text-xs font-medium text-primary transition-colors hover:text-primary-container"
                    >
                      忘记密码
                    </Link>
                  </div>
                  <AuthField
                    id="sign-in-password"
                    autoComplete="current-password"
                    labelClassName="sr-only"
                    placeholder="••••••••"
                    type="password"
                    containerClassName="space-y-0"
                  />
                </div>

                <Button className="w-full text-white" size="xl" type="submit" variant="primary">
                  立即登录
                </Button>
              </form>

              <AuthDivider className="mt-8" text="其他方式" />

              <div className="mt-6 flex gap-3">
                <Button className="flex-1 gap-2" size="lg" type="button" variant="tonal">
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path
                      d="M21.8 12.23c0-.74-.06-1.46-.19-2.14H12.2v4.05h5.39a4.7 4.7 0 0 1-2 3.09v2.64h3.24c1.89-1.74 2.97-4.31 2.97-7.64Z"
                      fill="currentColor"
                    />
                    <path
                      d="M12.2 22c2.7 0 4.96-.9 6.62-2.44l-3.24-2.64c-.9.6-2.02.97-3.38.97-2.6 0-4.82-1.76-5.61-4.12H3.29v2.7A9.99 9.99 0 0 0 12.2 22Z"
                      fill="currentColor"
                    />
                    <path
                      d="M6.59 13.77a5.96 5.96 0 0 1 0-3.54V7.54H3.29a10.05 10.05 0 0 0 0 8.92l3.3-2.69Z"
                      fill="currentColor"
                    />
                    <path
                      d="M12.2 6.11c1.47 0 2.79.5 3.83 1.49l2.87-2.87C17.15 3.09 14.89 2 12.2 2A9.99 9.99 0 0 0 3.29 7.54l3.3 2.69c.79-2.36 3.01-4.12 5.61-4.12Z"
                      fill="currentColor"
                    />
                  </svg>
                  Google
                </Button>
                <Button className="flex-1 gap-2" size="lg" type="button" variant="tonal">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                  Apple
                </Button>
              </div>

              <div className="mt-10 text-center">
                <p className="text-sm text-secondary">
                  还没有账号？{" "}
                  <Link
                    href="/auth/sign-up"
                    className="font-semibold text-primary decoration-2 underline-offset-4 hover:underline"
                  >
                    立即注册
                  </Link>
                </p>
              </div>
            </div>
          </AuthCard>
        </div>
      </main>

      <AuthPageFooter />
    </AuthShell>
  );
}
