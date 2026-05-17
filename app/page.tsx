import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { AccountMenu } from "@/components/account-menu";
import { BrandLogo } from "@/components/brand-logo";
import { FeatureList } from "@/components/landing/feature-list";
import { ScrollReveal } from "@/components/landing/scroll-reveal";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { painPoints, roadmapItems, scenarios } from "@/config/landing-page-content";
import { cn } from "@/lib/utils";
import { getSignedInUser } from "@/server/modules/auth/session";

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

const ROADMAP_LABELS = {
  shipped: "已上线",
  building: "进行中",
  planned: "计划中",
} as const;

const ANCHORS = {
  features: "#features", // DESIGN_TOKEN_EXCEPTION: anchor href string, not a color value
  scenarios: "#scenarios",
  roadmap: "#roadmap",
  howItWorks: "#how-it-works",
} as const;

// Shared class strings
const container = "w-[min(1120px,calc(100%-3rem))] mx-auto";
const sectionPy = "py-[clamp(4.5rem,7vw,7rem)]";
const navLinkCls = "inline-flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-[450] text-on-surface-variant rounded-md no-underline transition-colors duration-150 hover:text-on-surface";
const primaryCtaCls = "inline-flex items-center gap-1.5 bg-primary text-primary-foreground! rounded-md px-4 py-2 text-sm font-semibold no-underline transition-[opacity,transform] duration-150 hover:opacity-88 hover:-translate-y-px";
const primaryCtaLargeCls = "inline-flex items-center gap-2 bg-primary text-primary-foreground! rounded-md px-[1.625rem] py-3 text-[0.9375rem] font-semibold no-underline transition-[opacity,transform] duration-150 hover:opacity-88 hover:-translate-y-px active:scale-[0.98]";
const githubCtaCls = "inline-flex items-center gap-2 px-[1.625rem] py-3 text-[0.9375rem] font-medium text-on-surface! border border-foreground/14 rounded-md no-underline transition-[border-color,background] duration-150 hover:border-foreground/28 hover:bg-foreground/4";
const eyebrowCls = "text-[0.72rem] font-semibold tracking-[0.16em] uppercase text-primary";
const sectionTitleCls = "text-[clamp(1.875rem,3.2vw,2.625rem)] font-bold leading-[1.1] tracking-[-0.03em] text-on-surface text-balance";

export default async function LandingPage() {
  const user = await getSignedInUser();
  const workspaceHref = user ? "/workspace" : "/auth/sign-in";
  const workspaceLabel = user ? "进入工作区" : "立即体验";

  const shipped = roadmapItems.filter((i) => i.status === "shipped");
  const building = roadmapItems.filter((i) => i.status === "building");
  const planned = roadmapItems.filter((i) => i.status === "planned");

  return (
    <div className="min-h-screen bg-surface">
      {/* Navbar */}
      <header className="fixed inset-x-0 top-0 z-20 border-b border-foreground/6 bg-surface/88 backdrop-blur-xl">
        <div className={cn(container, "py-3.5")}>
          <div className="flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center shrink-0">
              <BrandLogo className="h-8 w-auto" priority />
            </Link>
            <nav className="flex items-center gap-0.5 max-[900px]:hidden" aria-label="主导航">
              <a href={ANCHORS.features} className={navLinkCls}>功能</a>
              <a href={ANCHORS.scenarios} className={navLinkCls}>场景</a>
              <a href={ANCHORS.roadmap} className={navLinkCls}>路线图</a>
            </nav>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Link href="https://github.com/zguiyang/gotly-keeper" target="_blank" rel="noopener noreferrer" className={navLinkCls}>
                <GithubIcon className="h-4 w-4" />
              </Link>
              {user ? (
                <>
                  <Link href="/workspace" className={primaryCtaCls}>进入工作区</Link>
                  <AccountMenu userEmail={user.email} userImage={user.image} userName={user.name} />
                </>
              ) : (
                <>
                  <Link href="/auth/sign-in" className={navLinkCls}>登录</Link>
                  <Link href="/auth/sign-up" className={primaryCtaCls}>免费注册</Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="pt-16">
        {/* Hero */}
        <section className="pt-[clamp(6rem,10vw,10rem)] pb-0 text-center">
          <div className={container}>
            <ScrollReveal variant="fade-up" delay={0}>
              <div className="inline-flex items-center gap-2 text-[0.72rem] font-medium tracking-[0.06em] text-on-surface-variant mb-6 opacity-70">
                <span>开源</span>
                <span className="w-[3px] h-[3px] rounded-full bg-current opacity-40" />
                <span>自托管</span>
                <span className="w-[3px] h-[3px] rounded-full bg-current opacity-40" />
                <span>数据归你</span>
              </div>
            </ScrollReveal>

            <ScrollReveal variant="fade-up" delay={80}>
              <h1 className="text-[clamp(3rem,7vw,6rem)] font-bold leading-none tracking-[-0.04em] text-on-surface mb-5">Gotly Keeper</h1>
            </ScrollReveal>

            <ScrollReveal variant="fade-up" delay={160}>
              <p className="text-[clamp(1.125rem,2vw,1.375rem)] font-medium text-on-surface tracking-[-0.01em] mb-2">说一句，收好。再问一句，找出来。</p>
              <p className="text-[clamp(0.9375rem,1.1vw,1.0625rem)] text-on-surface-variant leading-[1.7] mb-9">笔记、书签、待办，不用整理，不用分类。</p>
            </ScrollReveal>

            <ScrollReveal variant="fade-up" delay={240}>
              <div className="flex flex-wrap items-center justify-center gap-3.5 max-sm:flex-col max-sm:items-stretch">
                <Link href={workspaceHref} className={primaryCtaLargeCls}>
                  {workspaceLabel}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="https://github.com/zguiyang/gotly-keeper" target="_blank" rel="noopener noreferrer" className={githubCtaCls}>
                  <GithubIcon className="h-4 w-4" />
                  GitHub 开源
                </Link>
              </div>
            </ScrollReveal>
          </div>

          {/* Video placeholder */}
          <ScrollReveal variant="fade-up" delay={320} className={cn(container, "mt-[clamp(3rem,5vw,4.5rem)] flex flex-col items-center gap-5")}>
            <div className="w-full rounded-[10px] overflow-hidden border border-foreground/8 shadow-[0_-2px_40px_color-mix(in_srgb,var(--color-on-surface)_5%,transparent)]"> {/* DESIGN_TOKEN_EXCEPTION: shadow depth blend, no semantic token */}
              <div className="aspect-video bg-foreground/3 flex flex-col items-center justify-center gap-4">
                <div className="w-[52px] h-[52px] rounded-full bg-primary text-primary-foreground flex items-center justify-center opacity-70">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                </div>
                <p className="text-[0.8125rem] text-on-surface-variant opacity-50">产品演示视频</p>
              </div>
            </div>
            <p className="text-sm text-on-surface-variant opacity-70 text-center">轻量的个人信息收纳箱。不是笔记软件，不是任务管理。</p>
          </ScrollReveal>
        </section>

        {/* Pain points */}
        <section className={cn(container, sectionPy)}>
          <ScrollReveal variant="fade-in">
            <div className="flex flex-col gap-2.5 mb-12">
              <p className={eyebrowCls}>你是不是也这样</p>
              <h2 className={sectionTitleCls}>信息越来越多，<br />却越来越难找到。</h2>
            </div>
          </ScrollReveal>
          <ScrollReveal variant="fade-up" delay={80}>
            <div className="grid grid-cols-3 gap-5 max-[900px]:grid-cols-1">
              {painPoints.map((p) => (
                <div key={p.title} className="p-[1.625rem] border border-foreground/7 rounded-lg flex flex-col gap-2">
                  <p className="text-[0.9375rem] font-semibold text-on-surface tracking-[-0.01em]">{p.title}</p>
                  <p className="text-sm leading-[1.7] text-on-surface-variant">{p.desc}</p>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </section>

        {/* Features */}
        <section id="features" className={cn(sectionPy, "scroll-mt-16 bg-[color-mix(in_srgb,var(--color-on-surface)_2.5%,var(--color-surface))]")}> {/* DESIGN_TOKEN_EXCEPTION: alt-section tint, no semantic token for 2.5% surface blend */}
          <div className={container}>
            <ScrollReveal variant="fade-in">
              <div className="flex flex-col gap-2.5 mb-12">
                <p className={eyebrowCls}>核心功能</p>
                <h2 className={sectionTitleCls}>四件事，全部搞定。</h2>
              </div>
            </ScrollReveal>
            <FeatureList />
          </div>
        </section>

        {/* Scenarios */}
        <section id="scenarios" className={cn(container, sectionPy, "scroll-mt-16")}>
          <ScrollReveal variant="fade-in">
            <div className="flex flex-col gap-2.5 mb-12">
              <p className={eyebrowCls}>使用场景</p>
              <h2 className={sectionTitleCls}>不需要经营系统，<br />只需要先交给它。</h2>
            </div>
          </ScrollReveal>
          <ScrollReveal variant="fade-in" delay={80}>
            <div className="flex flex-col border-t border-foreground/8">
              {scenarios.map((s, i) => (
                <article key={s.role} className="grid grid-cols-[3rem_1fr_auto] max-[900px]:grid-cols-[2.5rem_1fr] items-start gap-8 max-[900px]:gap-4 py-[1.875rem] border-b border-foreground/8 transition-colors duration-200 hover:bg-foreground/2">
                  <span className="text-[0.72rem] font-semibold tracking-[0.1em] text-on-surface-variant/45 pt-[0.15rem] tabular-nums">0{i + 1}</span>
                  <div className="flex flex-col gap-[0.3rem]">
                    <h3 className="text-[0.9375rem] font-semibold text-on-surface tracking-[-0.01em]">{s.role}</h3>
                    <p className="text-sm leading-[1.65] text-on-surface-variant max-w-[34rem]">{s.desc}</p>
                  </div>
                  <p className="text-[0.8125rem] text-on-surface-variant italic max-w-[16rem] text-right pt-[0.15rem] opacity-60 max-[900px]:hidden">{s.example}</p>
                </article>
              ))}
            </div>
          </ScrollReveal>
        </section>

        {/* Roadmap */}
        <section id="roadmap" className={cn(sectionPy, "scroll-mt-16 bg-[color-mix(in_srgb,var(--color-on-surface)_2.5%,var(--color-surface))]")}> {/* DESIGN_TOKEN_EXCEPTION: alt-section tint, no semantic token for 2.5% surface blend */}
          <div className={container}>
            <ScrollReveal variant="fade-in">
              <div className="flex flex-col gap-2.5 mb-12">
                <p className={eyebrowCls}>持续在做的事</p>
                <h2 className={sectionTitleCls}>从第一个版本开始，<br />一直在变好。</h2>
              </div>
            </ScrollReveal>
            <ScrollReveal variant="fade-up" delay={80}>
              <div className="grid grid-cols-3 gap-5 max-[900px]:grid-cols-1">
                {([["shipped", shipped], ["building", building], ["planned", planned]] as const).map(([status, items]) => (
                  <div key={status} className="border border-foreground/7 rounded-lg overflow-hidden">
                    <div className={cn(
                      "px-5 py-3 text-xs font-semibold tracking-[0.08em] uppercase",
                      status === "shipped" && "bg-status-success/10 text-status-success",
                      status === "building" && "bg-primary/10 text-primary",
                      status === "planned" && "bg-foreground/5 text-on-surface-variant",
                    )}>
                      {ROADMAP_LABELS[status]}
                    </div>
                    <ul className="py-3 m-0 list-none flex flex-col">
                      {items.map((item) => (
                        <li key={item.label} className="px-5 py-2 text-sm text-on-surface-variant leading-[1.5] border-b border-foreground/5 last:border-b-0">{item.label}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-[clamp(5rem,9vw,9rem)] text-center">
          <div className={cn(container, "flex flex-col items-center gap-6")}>
            <ScrollReveal variant="fade-up">
              <p className={eyebrowCls}>开源 · 自托管 · 数据完全归你</p>
              <h2 className="text-[clamp(2rem,4vw,3rem)] font-bold tracking-[-0.04em] text-on-surface leading-[1.1] mt-2">开始用 Gotly Keeper</h2>
              <div className="flex flex-wrap items-center justify-center gap-3.5 mt-6 max-sm:flex-col max-sm:items-stretch">
                <Link href={workspaceHref} className={primaryCtaLargeCls}>
                  {workspaceLabel}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="https://github.com/zguiyang/gotly-keeper" target="_blank" rel="noopener noreferrer" className={githubCtaCls}>
                  <GithubIcon className="h-4 w-4" />
                  查看源码
                </Link>
              </div>
            </ScrollReveal>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-foreground/7">
        <div className={cn(container, "py-[1.625rem] flex items-center justify-between gap-6 max-sm:flex-col max-sm:items-start max-sm:gap-4")}>
          <p className="text-[0.8125rem] text-on-surface-variant/65">© 2026 Gotly Keeper. Quietly keeping what matters.</p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="text-[0.8125rem] text-on-surface-variant/55 no-underline transition-colors duration-150 hover:text-on-surface">隐私政策</Link>
            <Link href="/terms" className="text-[0.8125rem] text-on-surface-variant/55 no-underline transition-colors duration-150 hover:text-on-surface">使用条款</Link>
            <Link href="mailto:hi@gotly.app" className="text-[0.8125rem] text-on-surface-variant/55 no-underline transition-colors duration-150 hover:text-on-surface">联系我们</Link>
            <Link href="https://github.com/zguiyang/gotly-keeper" target="_blank" rel="noopener noreferrer" className="text-[0.8125rem] text-on-surface-variant/55 no-underline transition-colors duration-150 hover:text-on-surface">GitHub</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
