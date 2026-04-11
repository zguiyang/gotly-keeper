import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthNavbar } from "@/components/auth/auth-navbar";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthDivider } from "@/components/auth/auth-divider";
import { AuthField } from "@/components/auth/auth-field";
import { AuthPageFooter } from "@/components/auth/auth-footer";
import { Button } from "@/components/ui/button";

export default function SignUpPage() {
  return (
    <AuthShell>
      <AuthNavbar />

      <main className="flex flex-1 items-center justify-center px-6 pt-24 pb-12">
        <div className="flex w-full max-w-[440px] flex-col gap-10">
          <div className="space-y-3 pl-2 text-left">
            <h1 className="font-headline text-4xl font-extrabold leading-tight tracking-tight text-on-surface">
              开启你的灵感之旅
            </h1>
            <p className="text-base leading-relaxed text-on-secondary-container/80">
              创建一个账号，开始高效记录与检索
            </p>
          </div>

          <AuthCard>
            <form className="space-y-6">
              <AuthField
                autoComplete="username"
                inputClassName="bg-surface-container-low focus:bg-surface-container-lowest"
                label="用户名"
                placeholder="输入您的灵感代号"
              />
              <AuthField
                autoComplete="email"
                inputClassName="bg-surface-container-low focus:bg-surface-container-lowest"
                label="电子邮箱"
                placeholder="name@example.com"
              />
              <AuthField
                autoComplete="new-password"
                inputClassName="bg-surface-container-low focus:bg-surface-container-lowest"
                label="密码"
                placeholder="••••••••"
                type="password"
              />

              <div className="flex items-start gap-3 px-1">
                <input
                  className="mt-1 h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary/20"
                  id="terms"
                  type="checkbox"
                />
                <label className="text-sm leading-snug text-on-surface-variant" htmlFor="terms">
                  我同意{" "}
                  <Link className="font-medium text-primary hover:underline" href="/terms">
                    服务协议
                  </Link>{" "}
                  与{" "}
                  <Link className="font-medium text-primary hover:underline" href="/privacy">
                    隐私政策
                  </Link>
                </label>
              </div>

              <Button className="w-full gap-2 text-white" size="xl" type="submit" variant="primary">
                <span>创建账号</span>
                <ArrowRight className="h-5 w-5" />
              </Button>
            </form>

            <div className="pt-2 text-center">
              <p className="text-sm text-on-secondary-container">
                已有账号？{" "}
                <Link className="font-semibold text-primary hover:underline" href="/auth/sign-in">
                  立即登录
                </Link>
              </p>
            </div>
          </AuthCard>

          <AuthDivider text="或通过以下方式" />

          <div className="grid grid-cols-2 gap-4">
            <Button className="gap-3 text-on-surface" size="lg" type="button" variant="tonal">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9.52 3.5c1.48 0 2.68 1.2 2.68 2.68 0 1.17-.76 2.17-1.82 2.51L10 10.8H9.03l-.39-2.11a2.67 2.67 0 0 1-1.81-2.51A2.68 2.68 0 0 1 9.52 3.5Zm5.9 4.6c3.44 0 6.08 2.1 6.08 4.9 0 2.8-2.64 4.9-6.07 4.9-.44 0-.86-.04-1.27-.12l-2.1 1.18.67-1.8c-1.43-.86-2.3-2.3-2.3-4.16 0-2.8 2.64-4.9 6.08-4.9Z" />
              </svg>
              <span>WeChat</span>
            </Button>
            <Button className="gap-3 text-on-surface" size="lg" type="button" variant="tonal">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 .5A12 12 0 0 0 8.2 23.9c.6.11.8-.26.8-.58v-2.1c-3.34.72-4.04-1.42-4.04-1.42-.55-1.38-1.34-1.75-1.34-1.75-1.08-.74.09-.73.09-.73 1.2.09 1.83 1.23 1.83 1.23 1.07 1.84 2.8 1.3 3.49 1 .1-.77.42-1.3.76-1.6-2.66-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.17 0 0 1.01-.32 3.3 1.23a11.6 11.6 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.65 1.65.24 2.87.12 3.17.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.62-5.49 5.92.44.38.83 1.11.83 2.24v3.31c0 .32.19.69.8.57A12 12 0 0 0 12 .5Z" />
              </svg>
              <span>GitHub</span>
            </Button>
          </div>
        </div>
      </main>

      <AuthPageFooter />
    </AuthShell>
  );
}
