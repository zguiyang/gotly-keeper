import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthBrand } from "@/components/auth/auth-brand";

export default function ResetLinkSentPage() {
  return (
    <AuthShell>
      <header className="fixed top-0 left-0 z-10 flex w-full justify-center py-8">
        <AuthBrand />
      </header>

      <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-6">
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -right-24 -bottom-24 h-96 w-96 rounded-full bg-secondary-container/20 blur-3xl" />

        <div className="relative z-10 w-full max-w-[420px] text-center">
          <div className="mb-10 flex justify-center">
            <div
              className="flex h-24 w-24 items-center justify-center rounded-full bg-surface-container-lowest glow-icon auth-card-shadow"
              style={{ filter: "drop-shadow(0 0 15px rgba(0, 81, 177, 0.15))" }}
            >
              <span
                className="material-symbols-outlined text-6xl text-primary"
                style={{ fontVariationSettings: "'wght' 200" }}
              >
                check_circle
              </span>
            </div>
          </div>

          <h1 className="mb-4 font-headline text-3xl font-bold tracking-tight text-on-surface">
            链接已发送
          </h1>
          <p className="mb-12 font-body leading-relaxed text-secondary">
            重置密码链接已发送至你的邮箱，请注意查收。
          </p>

          <div className="space-y-4">
            <Link
              className="block w-full rounded-full bg-gradient-to-r from-primary to-primary-container px-6 py-4 text-center font-semibold text-white shadow-lg shadow-primary/10 transition-all hover:opacity-90 active:scale-[0.98]"
              href="/auth/sign-in"
            >
              回到登录
            </Link>
          </div>

          <div className="mt-12 border-t border-outline-variant/10 pt-8">
            <p className="font-body text-sm text-on-surface-variant">
              没有收到邮件？
              <button className="ml-1 text-primary transition-all hover:underline">重新发送</button>
            </p>
          </div>
        </div>

        <div className="absolute bottom-12 w-full text-center">
          <p className="font-label text-xs uppercase tracking-wide text-secondary opacity-70">
            Gotly AI • The Digital Curator
          </p>
        </div>
      </main>
    </AuthShell>
  );
}
