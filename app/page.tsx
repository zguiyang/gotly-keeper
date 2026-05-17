import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { AccountMenu } from "@/components/account-menu";
import { BrandLogo } from "@/components/brand-logo";
import { FeatureList } from "@/components/landing/feature-list";
import { ProductPreview } from "@/components/landing/product-preview";
import { ScrollReveal } from "@/components/landing/scroll-reveal";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { scenarios, socialProof } from "@/config/landing-page-content";
import { cn } from "@/lib/utils";
import { getSignedInUser } from "@/server/modules/auth/session";

import styles from "./page.module.css";

export default async function LandingPage() {
  const user = await getSignedInUser();
  const workspaceHref = user ? "/workspace" : "/auth/sign-in";
  const workspaceLabel = user ? "进入工作区" : "免费使用";

  return (
    <div className={styles.pageShell}>
      <div className={styles.content}>
        {/* Navbar */}
        <header className={styles.topbar}>
          <div className={cn(styles.container, styles.topbarInner)}>
            <div className={styles.nav}>
              <Link href="/" className={styles.brandLockup}>
                <BrandLogo className={styles.brandLogo} priority />
              </Link>

              <nav className={styles.navMenu} aria-label="页面导航">
                <a href="#how-it-works" className={styles.navLink}>核心能力</a>
                <a href="#scenarios" className={styles.navLink}>使用场景</a>
              </nav>

              <div className="flex items-center gap-2">
                <ThemeToggle />
                {user ? (
                  <>
                    <Link href="/workspace" className={styles.primaryCta}>进入工作区</Link>
                    <AccountMenu
                      userEmail={user.email}
                      userImage={user.image}
                      userName={user.name}
                    />
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

        <main className="flex-1">
          {/* Hero */}
          <section className={cn(styles.container, styles.heroSection)}>
            <div className={styles.heroGrid}>
              <div className={styles.heroCopy}>
                <ScrollReveal variant="fade-up" delay={0}>
                  <h1 className={styles.display}>
                    收进来，<br />找得回。
                  </h1>
                </ScrollReveal>

                <ScrollReveal variant="fade-up" delay={100}>
                  <p className={styles.lead}>
                    不需要整理，不需要分类。你只管扔，Gotly Keeper 替你记住。
                  </p>
                </ScrollReveal>

                <ScrollReveal variant="fade-up" delay={200}>
                  <div className={styles.ctaRow}>
                    <Link href={workspaceHref} className={styles.primaryCta}>
                      {workspaceLabel}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <a href="#how-it-works" className={styles.secondaryCta}>
                      了解更多
                    </a>
                  </div>
                  <p className={styles.trustNote}>你的数据归你 · 不用于模型训练 · 随时可以导出</p>
                </ScrollReveal>
              </div>

              <ScrollReveal variant="fade-in" delay={150} className={styles.heroVisual}>
                <ProductPreview />
              </ScrollReveal>
            </div>
          </section>

          {/* Stats strip */}
          <div className={styles.statsStrip}>
            <div className={styles.container}>
              <div className={styles.statsRow}>
                {socialProof.map((item) => (
                  <div key={item.label} className={styles.statItem}>
                    <span className={styles.statValue}>{item.value}</span>
                    <span className={styles.statLabel}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* How it works */}
          <section id="how-it-works" className={cn(styles.container, styles.section, styles.sectionAnchor)}>
            <ScrollReveal variant="fade-in">
              <div className={styles.sectionHeading}>
                <p className={styles.eyebrow}>核心能力</p>
                <h2 className={styles.sectionTitle}>三步，就是全部。</h2>
              </div>
            </ScrollReveal>
            <FeatureList />
          </section>

          {/* Scenarios */}
          <section id="scenarios" className={cn(styles.section, styles.sectionAnchor, styles.scenariosSection)}>
            <div className={styles.container}>
              <ScrollReveal variant="fade-in">
                <div className={styles.sectionHeading}>
                  <p className={styles.eyebrow}>真实场景</p>
                  <h2 className={styles.sectionTitle}>不需要经营系统，<br />只需要先交给它。</h2>
                </div>
              </ScrollReveal>

              <ScrollReveal variant="fade-in" delay={80}>
                <div className={styles.scenarioList}>
                  {scenarios.map((scenario, i) => (
                    <article key={scenario.title} className={styles.scenarioRow}>
                      <span className={styles.scenarioIndex}>0{i + 1}</span>
                      <div className={styles.scenarioBody}>
                        <h3 className={styles.scenarioTitle}>{scenario.title}</h3>
                        <p className={styles.scenarioDesc}>{scenario.description}</p>
                      </div>
                      <p className={styles.scenarioExample}>{scenario.example}</p>
                    </article>
                  ))}
                </div>
              </ScrollReveal>
            </div>
          </section>

          {/* Final CTA */}
          <section className={styles.finalCta}>
            <div className={cn(styles.container, styles.finalCtaInner)}>
              <ScrollReveal variant="fade-up">
                <h2 className={styles.finalCtaHeadline}>
                  记录不应该是负担。<br />找回不应该靠运气。
                </h2>
                <p className={styles.finalCtaBody}>
                  Gotly Keeper 安静地工作，始终记得你交给它的每一件事。
                </p>
                <Link href={workspaceHref} className={styles.finalCtaButton}>
                  {workspaceLabel}
                  <ArrowRight className="h-4 w-4" />
                </Link>
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
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
