import Link from "next/link";

import { AuthCard } from "@/components/auth/auth-card";
import { AuthDivider } from "@/components/auth/auth-divider";
import { AuthPageScaffold } from "@/components/auth/auth-page-scaffold";
import { SignInWithGithubButton } from "@/components/auth/sign-in-with-github-button";
import { SignUpForm } from "@/components/auth/sign-up-form";

export default function SignUpPage() {
  return (
    <AuthPageScaffold
      contentClassName="flex w-full max-w-[440px] flex-col gap-10"
      mainClassName="flex flex-1 items-center justify-center px-6 pt-24 pb-12"
    >
      <div className="space-y-3 pl-2 text-left">
        <h1 className="font-headline text-4xl font-extrabold leading-tight tracking-tight text-on-surface">
          开启你的灵感之旅
        </h1>
        <p className="text-base leading-relaxed text-on-surface-variant/80">
          创建一个账号，开始高效记录与检索
        </p>
      </div>

      <AuthCard>
        <SignUpForm />

        <div className="pt-2 text-center">
          <p className="text-sm text-on-surface-variant">
            已有账号？{" "}
            <Link className="font-semibold text-primary hover:underline" href="/auth/sign-in">
              立即登录
            </Link>
          </p>
        </div>
      </AuthCard>

      <AuthDivider text="或" />

      <SignInWithGithubButton label="使用 GitHub 注册" />
    </AuthPageScaffold>
  );
}
