import {
  ArrowRight,
  Archive,
  Compass,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

import { AccountMenu } from "@/components/account-menu";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  featureCards,
  floatingCards,
  manifestoTags,
  principles,
  scenarios,
} from "@/config/landing-page-content";
import { cn } from "@/lib/utils";
import { getSignedInUser } from "@/server/modules/auth/session";

import styles from "./page.module.css";

export default async function LandingPage() {
  const user = await getSignedInUser();
  const workspaceHref = user ? "/workspace" : "/auth/sign-in";
  const workspaceLabel = user ? "进入工作区" : "登录后进入工作区";

  return (
    <div className={styles.pageShell}>
      <div className={styles.noise} aria-hidden="true" />
      <div className={styles.content}>
        <header className={styles.topbar}>
          <div className={cn(styles.container, styles.topbarInner)}>
            <div className={styles.nav}>
              <Link href="/" className={styles.brandLockup}>
                <div className={styles.brandLogoBlock}>
                  <div className={styles.brandMark}>
                    <Archive className="h-5 w-5" />
                  </div>
                  <div className={cn(styles.brandMark, styles.brandMarkSecondary)}>
                    <Compass className="h-4 w-4" />
                  </div>
                </div>
                <div>
                  <p className="font-headline text-base font-semibold tracking-tight text-on-surface sm:text-lg">
                    Gotly Keeper
                  </p>
                  <p className="text-xs text-on-surface-variant">
                    Quiet AI concierge
                  </p>
                </div>
              </Link>

              <nav className={styles.navMenu} aria-label="页面导航">
                <a href="#capabilities" className={styles.navLink}>
                  核心能力
                </a>
                <a href="#scenarios" className={styles.navLink}>
                  使用场景
                </a>
                <a href="#principles" className={styles.navLink}>
                  产品原则
                </a>
                <a href="#manifesto" className={styles.navLink}>
                  品牌宣言
                </a>
              </nav>

              <div className="flex items-center gap-2 sm:gap-3">
                <ThemeToggle />
                {user ? (
                  <>
                    <Link
                      href="/workspace"
                      className={cn(
                        buttonVariants({ variant: "outline", size: "sm" }),
                        "hidden rounded-full border-primary/15 bg-surface-container-lowest/70 px-4 shadow-sm sm:inline-flex"
                      )}
                    >
                      进入工作区
                    </Link>
                    <AccountMenu
                      userEmail={user.email}
                      userImage={user.image}
                      userName={user.name}
                    />
                  </>
                ) : (
                  <>
                    <Link
                      href="/auth/sign-in"
                      className={cn(
                        buttonVariants({ variant: "ghost", size: "sm" }),
                        "rounded-full px-4 text-on-surface-variant hover:text-on-surface"
                      )}
                    >
                      登录
                    </Link>
                    <Link
                      href="/auth/sign-up"
                      className={cn(
                        buttonVariants({ variant: "outline", size: "sm" }),
                        "rounded-full border-primary/15 bg-surface-container-lowest/70 px-4 shadow-sm"
                      )}
                    >
                      注册
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 pb-16 sm:pb-24">
          <section className={cn(styles.container, styles.containerHero, styles.section, "pt-10 sm:pt-14")}>
            <div className={styles.heroGrid}>
              <div className={styles.heroCopy}>
                <Badge
                  variant="secondary"
                  className={cn(
                    styles.softBadge,
                    "rounded-full border border-primary/10 px-3 py-1 text-[0.72rem] uppercase tracking-[0.18em] text-primary"
                  )}
                >
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" data-icon="inline-start" />
                  Quiet AI concierge
                </Badge>

                <h1 className={cn(styles.display, "font-headline text-on-surface")}>
                  把零碎想法，收进一处安静的入口。
                </h1>

                <p className={styles.lead}>
                  你先随手交给我，我先帮你收好。以后你再问，我帮你找回来。
                </p>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Link
                    href={workspaceHref}
                    className={cn(
                      buttonVariants({ size: "lg" }),
                      styles.primaryCta,
                      "h-12 rounded-full px-6 shadow-lg shadow-primary/20"
                    )}
                  >
                    {workspaceLabel}
                    <ArrowRight
                      className="h-4 w-4 transition-transform duration-200 group-hover/button:translate-x-1"
                      data-icon="inline-end"
                    />
                  </Link>

                  <a
                    href="#capabilities"
                    className={cn(
                      buttonVariants({ variant: "outline", size: "lg" }),
                      styles.secondaryCta,
                      "h-12 rounded-full border-primary/15 bg-surface-container-lowest/70 px-6 shadow-sm"
                    )}
                  >
                    查看核心能力
                  </a>
                </div>

                <div className={styles.inlinePoints}>
                  <span>轻量收纳箱</span>
                  <span>统一入口</span>
                  <span>少管理</span>
                </div>
              </div>

              <div className={styles.stageWrap}>
                <div className={styles.stageGlow} aria-hidden="true" />
                <div className={styles.floatStage}>
                  {floatingCards.map((card, index) => (
                    <article
                      key={card.title}
                      className={styles.floatCard}
                      data-index={index}
                    >
                      <span className={styles.floatEyebrow}>{card.eyebrow}</span>
                      <p className={styles.floatTitle}>{card.title}</p>
                      <p className={styles.floatDescription}>{card.description}</p>
                    </article>
                  ))}

                  <div className={cn(styles.stageCaption, styles.panel)}>
                    <p className={styles.stageKicker}>AI 统一入口优先</p>
                    <p className="text-sm leading-7 text-on-surface-variant">
                      对系统来说是结构化资产，对用户来说只是“我交给小管家保管的东西”。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section id="capabilities" className={cn(styles.container, styles.section, styles.sectionAnchor)}>
            <div className={styles.sectionHeading}>
              <Badge variant="outline" className="rounded-full border-primary/15 px-3 py-1 text-primary">
                核心能力
              </Badge>
              <h2 className="font-headline text-3xl font-semibold tracking-tight text-on-surface sm:text-4xl">
                少一点管理动作，多一点自然交付。
              </h2>
              <p className={styles.sectionIntro}>
                首页不要求用户先理解结构，只需要先把内容交给系统，再在需要时自然找回。
              </p>
            </div>

            <div className={styles.featureGrid}>
              {featureCards.map((feature) => {
                const Icon = feature.icon;

                return (
                  <Card key={feature.title} className={cn(styles.panel, styles.cardSurface)}>
                    <CardContent className="space-y-5 p-7 sm:p-8">
                      <div className={styles.featureIcon}>
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs font-medium uppercase tracking-[0.16em] text-primary/80">
                          {feature.title}
                        </p>
                        <h3 className="font-headline text-xl font-semibold text-on-surface">
                          {feature.subtitle}
                        </h3>
                      </div>
                      <p className="text-sm leading-7 text-on-surface-variant">
                        {feature.description}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>

          <section
            id="scenarios"
            className={cn(styles.container, styles.section, styles.sectionTight, styles.sectionAnchor)}
          >
            <div className={styles.storyGrid}>
              <div className={styles.storyIntro}>
                <p className={styles.kicker}>真实场景</p>
                <h2 className="font-headline text-3xl font-semibold tracking-tight text-on-surface sm:text-4xl">
                  不需要经营系统，只需要先交给它。
                </h2>
                <p className={cn(styles.sectionIntro, styles.storyCopy)}>
                  Gotly Keeper 面向的是忙碌、轻量记录、容易收藏但不想维护复杂结构的人。
                </p>
              </div>

              <div className={styles.scenarioGrid}>
                {scenarios.map((scenario) => (
                  <article key={scenario.title} className={cn(styles.panel, styles.scenarioCard)}>
                    <p className={styles.kicker}>{scenario.title}</p>
                    <p className="text-sm leading-7 text-on-surface">{scenario.description}</p>
                    <p className="rounded-2xl bg-primary-fixed/45 px-4 py-3 text-sm text-on-surface-variant">
                      {scenario.example}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section id="principles" className={cn(styles.container, styles.section, styles.sectionAnchor)}>
            <div className={cn(styles.principles, styles.panel)}>
              <div className="space-y-4">
                <p className={styles.kicker}>产品原则</p>
                <h2 className="font-headline text-3xl font-semibold tracking-tight text-on-surface sm:text-4xl">
                  结构化是后台能力，不是前台负担。
                </h2>
                <p className={styles.sectionIntro}>
                  这不是一套要求你主动维护的重型系统，而是一处把输入、整理与找回 quietly 接住的入口。
                </p>
              </div>

              <div className={styles.principlesGrid}>
                {principles.map((principle, index) => (
                  <div key={principle} className={styles.principleItem}>
                    <span className={styles.principleIndex}>0{index + 1}</span>
                    <p className="text-sm leading-7 text-on-surface-variant">{principle}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section id="manifesto" className={cn(styles.container, styles.manifesto, styles.sectionAnchor)}>
            <div className={cn(styles.manifestoPanel, styles.panel)}>
              <div className={styles.manifestoCopyBlock}>
                <p className={styles.kicker}>Brand manifesto</p>
                <h2 className={cn(styles.manifestoCopy, "font-headline text-on-surface")}>
                  你先交给我，我替你安静收好。
                </h2>
                <p className={styles.manifestoDescription}>
                  Gotly Keeper 更像一处安静入口。先接住你零碎的记录，之后在需要时，把它们清楚地带回来。
                </p>
              </div>

              <div className={styles.manifestoSide}>
                <div className={styles.manifestoTags}>
                  {manifestoTags.map((tag) => (
                    <span key={tag} className={styles.manifestoTag}>
                      {tag}
                    </span>
                  ))}
                </div>

                <div className={styles.manifestoNote}>
                  <p className={styles.stageKicker}>Quietly keeping what matters</p>
                  <p>
                    不把输入变成负担，不把找回变成搜索训练，而是把系统变成一位可靠的小管家。
                  </p>
                </div>
              </div>
            </div>
          </section>
        </main>

        <footer className={styles.bottombar}>
          <div className={cn(styles.container, styles.bottombarInner)}>
            <div className="flex flex-col gap-3 py-6 text-sm text-on-surface-variant sm:flex-row sm:items-center sm:justify-between">
              <p>© 2026 Gotly Keeper. Quietly keeping what matters.</p>
              {user ? (
                <Link href={workspaceHref} className="transition-colors hover:text-primary">
                  进入工作区
                </Link>
              ) : (
                <div className="flex items-center gap-5">
                  <Link href="/auth/sign-in" className="transition-colors hover:text-primary">
                    登录
                  </Link>
                  <Link href="/auth/sign-up" className="transition-colors hover:text-primary">
                    注册
                  </Link>
                </div>
              )}
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
