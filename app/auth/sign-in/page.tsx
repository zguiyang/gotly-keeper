import Link from "next/link";

import { AuthCard } from "@/components/auth/auth-card";
import { AuthDivider } from "@/components/auth/auth-divider";
import { AuthPageScaffold } from "@/components/auth/auth-page-scaffold";
import { SignInForm } from "@/components/auth/sign-in-form";
import { Button } from "@/components/ui/button";

export default function SignInPage() {
  return (
    <AuthPageScaffold
      contentClassName="w-full max-w-[440px]"
      mainClassName="flex flex-1 items-center justify-center px-6 pt-24 pb-12"
    >
      <AuthCard className="relative overflow-hidden">
        <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-primary-fixed-dim/20 blur-3xl" />
        <div className="relative z-10">
          <div className="mb-10 text-center">
            <h1 className="font-headline mb-3 text-3xl font-bold tracking-tight text-on-surface">
              欢迎回来
            </h1>
            <p className="text-sm leading-relaxed text-secondary">登录 Gotly Keeper 以继续管理你的灵感</p>
          </div>

          <SignInForm />

          <AuthDivider className="mt-8" text="或" />

          <Button className="mt-6 w-full gap-3" size="lg" type="button" variant="secondary" disabled>
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 .5A12 12 0 0 0 8.2 23.9c.6.11.8-.26.8-.58v-2.1c-3.34.72-4.04-1.42-4.04-1.42-.55-1.38-1.34-1.75-1.34-1.75-1.08-.74.09-.73.09-.73 1.2.09 1.83 1.23 1.83 1.23 1.07 1.84 2.8 1.3 3.49 1 .1-.77.42-1.3.76-1.6-2.66-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.17 0 0 1.01-.32 3.3 1.23a11.6 11.6 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.65 1.65.24 2.87.12 3.17.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.62-5.49 5.92.44.38.83 1.11.83 2.24v3.31c0 .32.19.69.8.57A12 12 0 0 0 12 .5Z" />
            </svg>
            <span>使用 GitHub 登录</span>
          </Button>

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
    </AuthPageScaffold>
  );
}
