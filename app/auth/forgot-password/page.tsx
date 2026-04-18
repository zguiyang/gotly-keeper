import { Mail, ArrowLeft } from "lucide-react";
import Link from "next/link";

import { AuthField } from "@/components/auth/auth-field";
import { AuthPageScaffold } from "@/components/auth/auth-page-scaffold";
import { Button } from "@/components/ui/button";

export default function ForgotPasswordPage() {
  return (
    <AuthPageScaffold contentClassName="w-full max-w-md" mainClassName="flex flex-1 items-center justify-center px-6">
      <div className="mb-10 text-left">
        <h1 className="mb-3 text-4xl font-extrabold tracking-tight text-on-surface">找回密码</h1>
        <p className="font-medium leading-relaxed text-on-surface-variant">
          请输入你的注册邮箱，我们将为你发送验证链接
        </p>
      </div>

      <div className="space-y-8">
        <AuthField
          autoComplete="email"
          inputClassName="py-4"
          label="EMAIL"
          name="email"
          placeholder="your@email.com"
          prefixIcon={<Mail className="text-lg" />}
          spellCheck={false}
          type="email"
        />

        <Button
          className="h-12 w-full rounded-full text-base"
          type="submit"
        >
          发送验证链接
        </Button>

        <div className="flex flex-col items-center pt-4">
          <Link
            className="group flex items-center gap-2 text-sm font-semibold text-primary transition-opacity hover:opacity-80"
            href="/auth/sign-in"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>返回登录</span>
          </Link>
        </div>
      </div>
    </AuthPageScaffold>
  );
}
