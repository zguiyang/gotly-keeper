import { CheckCircle } from "lucide-react";
import Link from "next/link";

import { AuthPageScaffold } from "@/components/auth/auth-page-scaffold";

export default function ResetLinkSentPage() {
  return (
    <AuthPageScaffold
      mainClassName="relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-6"
      withFooter={false}
    >
      <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute -right-24 -bottom-24 h-96 w-96 rounded-full bg-secondary-container/20 blur-3xl" />

      <div className="relative z-10 w-full max-w-[420px] text-center">
        <div className="mb-10 flex justify-center">
          <div
            className="flex h-24 w-24 items-center justify-center rounded-full bg-surface-container-lowest shadow-[var(--shadow-soft)]"
            style={{ filter: "drop-shadow(0 0 15px rgba(0, 81, 177, 0.15))" }}
          >
            <CheckCircle className="h-14 w-14 text-primary" strokeWidth={1.5} />
          </div>
        </div>

        <h1 className="mb-4 font-headline text-3xl font-bold tracking-tight text-on-surface">链接已发送</h1>
        <p className="mb-12 font-body leading-relaxed text-secondary">
          重置密码链接已发送至你的邮箱，请注意查收。
        </p>

        <div className="space-y-4">
          <Link
            className="block w-full rounded-full bg-gradient-to-r from-primary to-primary-container px-6 py-4 text-center font-semibold text-white shadow-lg shadow-primary/10 transition-[transform,opacity,box-shadow] duration-200 hover:opacity-90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            href="/auth/sign-in"
          >
            回到登录
          </Link>
        </div>

        <div className="mt-12 border-t border-outline-variant/10 pt-8">
          <p className="font-body text-sm text-on-surface-variant">
            没有收到邮件？
            <button
              type="button"
              className="ml-1 text-primary transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              重新发送
            </button>
          </p>
        </div>
      </div>

      <div className="absolute bottom-12 w-full text-center">
        <p className="font-label text-xs uppercase tracking-wide text-secondary opacity-70">
          Gotly AI • The Digital Curator
        </p>
      </div>
    </AuthPageScaffold>
  );
}
