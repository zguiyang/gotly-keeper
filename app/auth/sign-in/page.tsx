import Link from "next/link";

import { AuthCard } from "@/components/auth/auth-card";
import { AuthDivider } from "@/components/auth/auth-divider";
import { AuthPageScaffold } from "@/components/auth/auth-page-scaffold";
import { SignInForm } from "@/components/auth/sign-in-form";
import { SignInWithGithubButton } from "@/components/auth/sign-in-with-github-button";

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

          <SignInWithGithubButton label="使用 GitHub 登录" />

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
