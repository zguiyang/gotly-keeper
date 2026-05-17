import Link from "next/link";

import { AuthCard, AuthHeader } from "@/components/auth/auth-card";
import { AuthDivider } from "@/components/auth/auth-divider";
import { AuthPageScaffold } from "@/components/auth/auth-page-scaffold";
import { SignInForm } from "@/components/auth/sign-in-form";
import { SignInWithGithubButton } from "@/components/auth/sign-in-with-github-button";

export default function SignInPage() {
  return (
    <AuthPageScaffold
      contentClassName="w-full max-w-[440px]"
      mainClassName="flex flex-1 items-center justify-center px-6 py-12 sm:py-16"
      withFooter={false}
    >
      <AuthCard>
        <AuthHeader title="欢迎回来" description="登录 Gotly Keeper，继续记录你的想法。" />

        <SignInForm />

        <AuthDivider className="my-6" text="或" />

        <SignInWithGithubButton label="使用 GitHub 登录" />

        <div className="mt-7 text-center">
          <p className="text-sm text-on-surface-variant">
            还没有账号？{" "}
            <Link
              href="/auth/sign-up"
              className="font-semibold text-primary underline-offset-4 transition-colors duration-150 hover:text-primary-dim hover:underline"
            >
              立即注册
            </Link>
          </p>
        </div>
      </AuthCard>
    </AuthPageScaffold>
  );
}
