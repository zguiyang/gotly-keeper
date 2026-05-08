import Link from "next/link";

import { AuthCard, AuthHeader } from "@/components/auth/auth-card";
import { AuthDivider } from "@/components/auth/auth-divider";
import { AuthPageScaffold } from "@/components/auth/auth-page-scaffold";
import { SignInWithGithubButton } from "@/components/auth/sign-in-with-github-button";
import { SignUpForm } from "@/components/auth/sign-up-form";

export default function SignUpPage() {
  return (
    <AuthPageScaffold
      contentClassName="w-full max-w-[440px]"
      mainClassName="flex flex-1 items-center justify-center px-6 py-12 sm:py-16"
      withFooter={false}
    >
      <AuthCard>
        <AuthHeader title="开启你的灵感之旅" description="创建账号，开始高效记录与检索。" />

        <SignUpForm />

        <div className="mt-5 text-center">
          <p className="text-sm text-on-surface-variant">
            已有账号？{" "}
            <Link
              className="font-semibold text-primary underline-offset-4 transition-colors duration-150 hover:text-primary-dim hover:underline"
              href="/auth/sign-in"
            >
              立即登录
            </Link>
          </p>
        </div>

        <AuthDivider className="my-6" text="或" />

        <SignInWithGithubButton label="使用 GitHub 注册" />
      </AuthCard>
    </AuthPageScaffold>
  );
}
