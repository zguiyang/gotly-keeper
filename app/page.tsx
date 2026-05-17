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

import styles from "./page.module.css";

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

// DESIGN_TOKEN_EXCEPTION: anchor href strings, not color values
const ANCHORS = {
  features: "#features", // DESIGN_TOKEN_EXCEPTION: anchor id, not color
  scenarios: "#scenarios", // DESIGN_TOKEN_EXCEPTION: anchor id, not color
  roadmap: "#roadmap", // DESIGN_TOKEN_EXCEPTION: anchor id, not color
  howItWorks: "#how-it-works", // DESIGN_TOKEN_EXCEPTION: anchor id, not color
} as const;

export default async function LandingPage() {
  const user = await getSignedInUser();
  const workspaceHref = user ? "/workspace" : "/auth/sign-in";
  const workspaceLabel = user ? "进入工作区" : "立即体验";

  const shipped = roadmapItems.filter((i) => i.status === "shipped");
  const building = roadmapItems.filter((i) => i.status === "building");
  const planned = roadmapItems.filter((i) => i.status === "planned");

  return (
    <div className={styles.pageShell}>
      {/* Navbar */}
      <header className={styles.topbar}>
        <div className={cn(styles.container, styles.topbarInner)}>
          <div className={styles.nav}>
            <Link href="/" className={styles.brandLockup}>
              <BrandLogo className={styles.brandLogo} priority />
            </Link>
            <nav className={styles.navMenu} aria-label="主导航">
              <a href={ANCHORS.features} className={styles.navLink}>功能</a>
              <a href={ANCHORS.scenarios} className={styles.navLink}>场景</a>
              <a href={ANCHORS.roadmap} className={styles.navLink}>路线图</a>
            </nav>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Link href="https://github.com/zguiyang/gotly-keeper" target="_blank" rel="noopener noreferrer" className={styles.navLink}>
                <GithubIcon className="h-4 w-4" />
              </Link>
              {user ? (
                <>
                  <Link href="/workspace" className={styles.primaryCta}>进入工作区</Link>
                  <AccountMenu userEmail={user.email} userImage={user.image} userName={user.name} />
                </>
              ) : (
                <>
                  <Link href="/auth/sign-in" className={styles.navLink}>登录</Link>
                  <Link href="/auth/sign-up" className={styles.primaryCta}>免费注册</Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        {/* Hero */}
        <section className={styles.heroSection}>
          <div className={styles.container}>
            <ScrollReveal variant="fade-up" delay={0}>
              <div className={styles.heroBadge}>
                <span>开源</span>
                <span className={styles.badgeDot} />
                <span>自托管</span>
                <span className={styles.badgeDot} />
                <span>数据归你</span>
              </div>
            </ScrollReveal>

            <ScrollReveal variant="fade-up" delay={80}>
              <h1 className={styles.display}>Gotly Keeper</h1>
            </ScrollReveal>

            <ScrollReveal variant="fade-up" delay={160}>
              <p className={styles.heroTagline}>说一句，收好。再问一句，找出来。</p>
              <p className={styles.lead}>笔记、书签、待办，不用整理，不用分类。</p>
            </ScrollReveal>

            <ScrollReveal variant="fade-up" delay={240}>
              <div className={styles.ctaRow}>
                <Link href={workspaceHref} className={styles.primaryCtaLarge}>
                  {workspaceLabel}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="https://github.com/zguiyang/gotly-keeper" target="_blank" rel="noopener noreferrer" className={styles.githubCta}>
                  <GithubIcon className="h-4 w-4" />
                  GitHub 开源
                </Link>
              </div>
            </ScrollReveal>
          </div>

          {/* Video placeholder */}
          <ScrollReveal variant="fade-up" delay={320} className={styles.videoWrap}>
            <div className={styles.videoFrame}>
              <div className={styles.videoPlaceholder}>
                <div className={styles.videoPlayBtn}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                </div>
                <p className={styles.videoPlaceholderText}>产品演示视频</p>
              </div>
            </div>
            <p className={styles.videoCaption}>轻量的个人信息收纳箱。不是笔记软件，不是任务管理。</p>
          </ScrollReveal>
        </section>



        {/* Pain points */}
        <section className={cn(styles.container, styles.section)}>
          <ScrollReveal variant="fade-in">
            <div className={styles.sectionHeading}>
              <p className={styles.eyebrow}>你是不是也这样</p>
              <h2 className={styles.sectionTitle}>信息越来越多，<br />却越来越难找到。</h2>
            </div>
          </ScrollReveal>
          <ScrollReveal variant="fade-up" delay={80}>
            <div className={styles.painGrid}>
              {painPoints.map((p) => (
                <div key={p.title} className={styles.painCard}>
                  <p className={styles.painTitle}>{p.title}</p>
                  <p className={styles.painDesc}>{p.desc}</p>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </section>

        {/* Features */}
        <section id="features" className={cn(styles.section, styles.sectionAnchor, styles.altSection)}>
          <div className={styles.container}>
            <ScrollReveal variant="fade-in">
              <div className={styles.sectionHeading}>
                <p className={styles.eyebrow}>核心功能</p>
                <h2 className={styles.sectionTitle}>四件事，全部搞定。</h2>
              </div>
            </ScrollReveal>
            <FeatureList />
          </div>
        </section>

        {/* Scenarios */}
        <section id="scenarios" className={cn(styles.container, styles.section, styles.sectionAnchor)}>
          <ScrollReveal variant="fade-in">
            <div className={styles.sectionHeading}>
              <p className={styles.eyebrow}>使用场景</p>
              <h2 className={styles.sectionTitle}>不需要经营系统，<br />只需要先交给它。</h2>
            </div>
          </ScrollReveal>
          <ScrollReveal variant="fade-in" delay={80}>
            <div className={styles.scenarioList}>
              {scenarios.map((s, i) => (
                <article key={s.role} className={styles.scenarioRow}>
                  <span className={styles.scenarioIndex}>0{i + 1}</span>
                  <div className={styles.scenarioBody}>
                    <h3 className={styles.scenarioRole}>{s.role}</h3>
                    <p className={styles.scenarioDesc}>{s.desc}</p>
                  </div>
                  <p className={styles.scenarioExample}>{s.example}</p>
                </article>
              ))}
            </div>
          </ScrollReveal>
        </section>

        {/* Roadmap */}
        <section id="roadmap" className={cn(styles.section, styles.sectionAnchor, styles.altSection)}>
          <div className={styles.container}>
            <ScrollReveal variant="fade-in">
              <div className={styles.sectionHeading}>
                <p className={styles.eyebrow}>持续在做的事</p>
                <h2 className={styles.sectionTitle}>从第一个版本开始，<br />一直在变好。</h2>
              </div>
            </ScrollReveal>
            <ScrollReveal variant="fade-up" delay={80}>
              <div className={styles.roadmapGrid}>
                {([["shipped", shipped], ["building", building], ["planned", planned]] as const).map(([status, items]) => (
                  <div key={status} className={styles.roadmapCol}>
                    <div className={cn(styles.roadmapColHeader, styles[`roadmap_${status}`])}>
                      {ROADMAP_LABELS[status]}
                    </div>
                    <ul className={styles.roadmapList}>
                      {items.map((item) => (
                        <li key={item.label} className={styles.roadmapItem}>{item.label}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* Final CTA */}
        <section className={styles.finalCta}>
          <div className={cn(styles.container, styles.finalCtaInner)}>
            <ScrollReveal variant="fade-up">
              <p className={styles.eyebrow}>开源 · 自托管 · 数据完全归你</p>
              <h2 className={styles.finalCtaHeadline}>开始用 Gotly Keeper</h2>
              <div className={styles.ctaRow}>
                <Link href={workspaceHref} className={styles.primaryCtaLarge}>
                  {workspaceLabel}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="https://github.com/zguiyang/gotly-keeper" target="_blank" rel="noopener noreferrer" className={styles.githubCta}>
                  <GithubIcon className="h-4 w-4" />
                  查看源码
                </Link>
              </div>
            </ScrollReveal>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className={styles.bottombar}>
        <div className={cn(styles.container, styles.bottombarInner)}>
          <p className={styles.footerCopy}>© 2026 Gotly Keeper. Quietly keeping what matters.</p>
          <div className={styles.footerLinks}>
            <Link href="/privacy" className={styles.footerLink}>隐私政策</Link>
            <Link href="/terms" className={styles.footerLink}>使用条款</Link>
            <Link href="mailto:hi@gotly.app" className={styles.footerLink}>联系我们</Link>
            <Link href="https://github.com/zguiyang/gotly-keeper" target="_blank" rel="noopener noreferrer" className={styles.footerLink}>GitHub</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
