import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { AccountMenu } from "@/components/account-menu";
import { BrandLogo } from "@/components/brand-logo";
import { ScrollReveal } from "@/components/landing/scroll-reveal";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Separator } from "@/components/ui/separator";
import { getServerTranslation } from "@/hooks/use-locale.server";
import { cn } from "@/lib/utils";
import { getSignedInUser } from "@/server/modules/auth/session";

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

// Shared class strings
const container = "w-[min(1120px,calc(100%-3rem))] mx-auto";
const sectionPy = "py-[clamp(4.5rem,7vw,7rem)]";
const navLinkCls = "inline-flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-[450] text-on-surface-variant rounded-md no-underline transition-colors duration-150 hover:text-on-surface";
const eyebrowCls = "text-[0.72rem] font-semibold tracking-[0.16em] uppercase text-primary";
const sectionTitleCls = "text-[clamp(1.875rem,3.2vw,2.625rem)] font-bold leading-[1.1] tracking-[-0.03em] text-on-surface text-balance";
const bodyTextCls = "text-[0.9375rem] leading-[1.7] text-on-surface-variant max-w-[42rem]";

export default async function LandingPage() {
  const user = await getSignedInUser();
  const workspaceHref = user ? "/workspace" : "/auth/sign-in";

  const tNav = await getServerTranslation("landing.nav");
  const tHero = await getServerTranslation("landing.hero");
  const tHow = await getServerTranslation("landing.howItWorks");
  const tComparison = await getServerTranslation("landing.comparison");
  const tStatus = await getServerTranslation("landing.status");
  const tCta = await getServerTranslation("landing.cta");
  const tFooter = await getServerTranslation("landing.footer");

  const workspaceLabel = user ? tHero("enterWorkspace") : tHero("tryNow");
  const steps = tHow.raw("steps") as { title: string; desc: string }[];
  const examples = tHow.raw("examples") as { input: string; result: string }[];
  const comparisonRows = tComparison.raw("rows") as { scenario: string; others: string; gotly: string }[];
  const shipped = tStatus.raw("shipped") as string[];
  const building = tStatus.raw("building") as string[];

  return (
    <div className="min-h-screen min-h-dvh bg-surface">
      {/* Navbar */}
      <header className="fixed inset-x-0 top-0 z-20 border-b border-foreground/6 bg-surface/88 backdrop-blur-xl">
        <div className={cn(container, "py-3.5")}>
          <div className="flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center shrink-0">
              <BrandLogo className="h-8 w-auto" priority />
            </Link>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Link href="https://github.com/zguiyang/gotly-keeper" target="_blank" rel="noopener noreferrer" className={navLinkCls}>
                <GithubIcon className="h-4 w-4" />
              </Link>
              {user ? (
                <AccountMenu userEmail={user.email} userImage={user.image} userName={user.name} />
              ) : (
                <>
                  <Link href="/auth/sign-in" className={cn(navLinkCls, "max-[640px]:hidden")}>{tNav("signIn")}</Link>
                  <Link href="/auth/sign-up" className={cn(navLinkCls, "max-[640px]:hidden")}>{tNav("signUp")}</Link>
                </>
              )}
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      </header>

      <main className="pt-16">
        {/* ① Hero */}
        <section className="pt-[clamp(6rem,10vw,10rem)] pb-0">
          <div className={container}>
            <ScrollReveal variant="fade-up">
              <h1 className="text-[clamp(2.5rem,5.5vw,4.5rem)] font-bold leading-[1.05] tracking-[-0.04em] text-on-surface text-balance mb-5">
                {tHero("tagline")}
              </h1>
              <p className="text-[clamp(1rem,1.3vw,1.125rem)] text-on-surface-variant leading-[1.65] max-w-[36rem] mb-9">
                {tHero("subtitle")}
              </p>
            </ScrollReveal>

            <ScrollReveal variant="fade-up">
              <div className="flex flex-wrap items-center gap-3.5 max-sm:flex-col max-sm:items-stretch">
                <Link
                  href={workspaceHref}
                  className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-lg px-[1.625rem] py-3 text-[0.9375rem] font-semibold no-underline transition-[opacity,transform] duration-150 hover:opacity-90 hover:-translate-y-px active:scale-[0.98]"
                >
                  {workspaceLabel}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="https://github.com/zguiyang/gotly-keeper"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-[1.625rem] py-3 text-[0.9375rem] font-medium text-on-surface border border-foreground/14 rounded-lg no-underline transition-[border-color,background] duration-150 hover:border-foreground/28 hover:bg-foreground/4"
                >
                  <GithubIcon className="h-4 w-4" />
                  {tHero("githubLink")}
                </Link>
              </div>
            </ScrollReveal>

            {/* Demo video */}
            <ScrollReveal variant="fade-up" className="mt-[clamp(3rem,5vw,4.5rem)]">
              <div className="rounded-[10px] overflow-hidden border border-foreground/8 shadow-[0_-2px_40px_color-mix(in_srgb,var(--color-on-surface)_5%,transparent)]"> {/* DESIGN_TOKEN_EXCEPTION: shadow depth blend, no semantic token */}
                <video
                  className="aspect-video w-full"
                  src="https://cloud.zgyk.cc/f/OJfb/example.mp4"
                  autoPlay
                  muted
                  loop
                  playsInline
                  controls
                />
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* ② How It Works */}
        <section className={cn(container, sectionPy)}>
          <ScrollReveal variant="fade-in">
            <p className={eyebrowCls}>{tHow("eyebrow")}</p>
          </ScrollReveal>

          <div className="mt-12 space-y-10">
            {steps.map((step, i) => (
              <ScrollReveal key={step.title} variant="fade-up">
                <h3 className="text-[1.125rem] font-semibold text-on-surface tracking-[-0.01em] mb-2">
                  {step.title}
                </h3>
                <p className={bodyTextCls}>{step.desc}</p>
                {i < steps.length - 1 && <Separator className="mt-10" />}
              </ScrollReveal>
            ))}
          </div>

          {/* Screenshot */}
          <ScrollReveal variant="fade-up" className="mt-12">
            <div className="rounded-[10px] overflow-hidden border border-foreground/8">
              <Image
                src="https://cloud.zgyk.cc/f/xEt0/example2.webp"
                alt="Gotly Keeper interface"
                width={1120}
                height={630}
                className="w-full h-auto"
                priority={false}
              />
            </div>
          </ScrollReveal>

          {/* Examples */}
          <ScrollReveal variant="fade-up" className="mt-10">
            <div className="space-y-2.5 pl-4 border-l-2 border-foreground/10">
              {examples.map((ex) => (
                <p key={ex.input} className="text-sm text-on-surface-variant leading-[1.6]">
                  <span className="text-on-surface/70">{ex.input}</span>{" "}
                  <span className="text-on-surface-variant/60">{ex.result}</span>
                </p>
              ))}
            </div>
          </ScrollReveal>
        </section>

        {/* ③ Comparison */}
        <section className={cn(sectionPy, "bg-[color-mix(in_srgb,var(--color-on-surface)_2.5%,var(--color-surface))]")}> {/* DESIGN_TOKEN_EXCEPTION: alt-section tint, no semantic token for 2.5% surface blend */}
          <div className={container}>
            <ScrollReveal variant="fade-in">
              <p className={cn(eyebrowCls, "normal-case")}>{tComparison("eyebrow")}</p>
              <h2 className={cn(sectionTitleCls, "mt-2.5 mb-4")}>{tComparison("tagline")}</h2>
            </ScrollReveal>

            <ScrollReveal variant="fade-up" className="mt-8">
              <div className="overflow-x-auto -mx-4 px-4">
                <table className="w-full min-w-[560px] text-left border-collapse">
                  <thead>
                    <tr className="border-b border-foreground/12">
                      <th className="py-3 pr-6 text-xs font-semibold tracking-[0.08em] text-on-surface-variant/60">
                        {tComparison("scenario")}
                      </th>
                      <th className="py-3 pr-6 text-xs font-semibold tracking-[0.08em] text-on-surface-variant/60">
                        {tComparison("others")}
                      </th>
                      <th className="py-3 text-xs font-semibold tracking-[0.08em] text-on-surface-variant/60">
                        {tComparison("gotly")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonRows.map((row) => (
                      <tr key={row.scenario} className="border-b border-foreground/5 last:border-b-0">
                        <td className="py-3.5 pr-6 text-sm font-medium text-on-surface">{row.scenario}</td>
                        <td className="py-3.5 pr-6 text-sm text-on-surface-variant leading-[1.55]">{row.others}</td>
                        <td className="py-3.5 text-sm text-on-surface-variant leading-[1.55]">{row.gotly}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* ④ Project Status */}
        <section className={cn(container, sectionPy)}>
          <ScrollReveal variant="fade-in">
            <p className={eyebrowCls}>{tStatus("eyebrow")}</p>
            <h2 className={cn(sectionTitleCls, "mt-2.5 mb-4")}>{tStatus("title")}</h2>
            <p className={cn(bodyTextCls, "mb-10")}>{tStatus("description")}</p>
          </ScrollReveal>

          <ScrollReveal variant="fade-up">
            <div className="grid grid-cols-2 gap-8 max-sm:grid-cols-1 max-sm:gap-6">
              <div>
                <h3 className="text-xs font-semibold tracking-[0.08em] uppercase text-status-success mb-4">
                  {tStatus("shippedLabel")}
                </h3>
                <ul className="space-y-2">
                  {shipped.map((item) => (
                    <li key={item} className="text-sm text-on-surface-variant leading-[1.55]">{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-xs font-semibold tracking-[0.08em] uppercase text-primary mb-4">
                  {tStatus("buildingLabel")}
                </h3>
                <ul className="space-y-2">
                  {building.map((item) => (
                    <li key={item} className="text-sm text-on-surface-variant leading-[1.55]">{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </ScrollReveal>
        </section>

        {/* ⑤ CTA */}
        <section className={cn(sectionPy, "bg-[color-mix(in_srgb,var(--color-on-surface)_2.5%,var(--color-surface))]")}> {/* DESIGN_TOKEN_EXCEPTION: alt-section tint, no semantic token for 2.5% surface blend */}
          <div className={container}>
            <ScrollReveal variant="fade-up">
              <div className="max-w-[38rem]">
                <p className={cn(bodyTextCls, "mb-5")}>{tCta("greeting")}</p>
                <p className={cn(bodyTextCls, "mb-4")}>{tCta("feedback")}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3.5 max-sm:flex-col max-sm:items-stretch">
                <Link
                  href={workspaceHref}
                  className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-lg px-5 py-[0.625rem] text-sm font-semibold no-underline transition-[opacity,transform] duration-150 hover:opacity-90 hover:-translate-y-px active:scale-[0.98]"
                >
                  {workspaceLabel}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="https://github.com/zguiyang/gotly-keeper/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-5 py-[0.625rem] text-sm font-medium text-on-surface-variant border border-foreground/14 rounded-lg no-underline transition-colors duration-150 hover:border-foreground/28 hover:bg-foreground/4"
                >
                  <GithubIcon className="h-4 w-4" />
                  {tCta("issuesLink")}
                </Link>
              </div>
            </ScrollReveal>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-foreground/7">
        <div className={cn(container, "py-[1.625rem] flex items-center justify-between gap-6 max-sm:flex-col max-sm:items-start max-sm:gap-4")}>
          <p className="text-[0.8125rem] text-on-surface-variant/65">© 2026 Gotly Keeper. {tFooter("tagline")}</p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="text-[0.8125rem] text-on-surface-variant/55 no-underline transition-colors duration-150 hover:text-on-surface">{tFooter("privacy")}</Link>
            <Link href="/terms" className="text-[0.8125rem] text-on-surface-variant/55 no-underline transition-colors duration-150 hover:text-on-surface">{tFooter("terms")}</Link>
            <Link href="mailto:hi@gotly.app" className="text-[0.8125rem] text-on-surface-variant/55 no-underline transition-colors duration-150 hover:text-on-surface">{tFooter("contact")}</Link>
            <Link href="https://github.com/zguiyang/gotly-keeper" target="_blank" rel="noopener noreferrer" className="text-[0.8125rem] text-on-surface-variant/55 no-underline transition-colors duration-150 hover:text-on-surface">{tFooter("github")}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
