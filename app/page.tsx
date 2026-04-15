"use client";

import {
  Zap,
  Brain,
  Search,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const features = [
  {
    icon: Zap,
    title: "捕捉 Capture",
    description: "语音、图片、文本，多模态输入让记录更自然。灵感稍纵即逝，一触即达。",
    badge: "多模态",
  },
  {
    icon: Brain,
    title: "整理 Refine",
    description: "AI 自动整理归类，智能标签让碎片信息有序归档。告别信息焦虑。",
    badge: "AI 驱动",
  },
  {
    icon: Search,
    title: "检索 Retrieve",
    description: "随时快速访问，语义搜索让记忆重现。找到你需要的，不费吹灰之力。",
    badge: "语义搜索",
  },
];

export default function LandingPage() {
  return (
    <div className="auth-atmosphere min-h-screen">
      <div className="relative flex min-h-screen flex-col">
        {/* Main Content */}
        <main className="flex-1">
          <div className="mx-auto max-w-5xl px-6 py-16">
            {/* Hero Section */}
            <section className="flex flex-col items-center text-center mb-24">
              {/* Logo */}
              <div className="mb-8">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary-container flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-3xl">G</span>
                </div>
              </div>

              {/* Brand Name */}
              <h1 className="font-headline text-2xl font-bold tracking-tight text-on-surface mb-4">
                Gotly AI
              </h1>

              {/* Main Headline */}
              <h2 className="font-headline text-4xl md:text-5xl font-extrabold tracking-tight text-on-surface mb-6 max-w-2xl">
                安静地架构你的思维
              </h2>

              {/* Subtitle */}
              <p className="text-lg text-on-surface-variant mb-10 max-w-xl leading-relaxed">
                轻量级 AI 思维捕捉工具，让灵感有序绽放。捕捉、整
                <span className="relative inline-block mx-1">
                  <span className="relative z-10">理</span>
                  <span className="absolute bottom-0 left-0 right-0 h-2 bg-primary/20 rounded-full -mb-1" />
                </span>
                、检索，一切从容不迫。
              </p>

              {/* CTA */}
              <Link href="/workspace">
                <Button
                  className="bg-gradient-to-r from-primary to-primary-container text-white px-8 py-6 rounded-full text-base font-semibold shadow-md hover:shadow-lg hover:opacity-90 transition-all duration-200 group"
                  size="lg"
                >
                  进入工作空间
                  <ArrowRight
                    className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform"
                    data-icon="inline-end"
                  />
                </Button>
              </Link>
            </section>

            {/* Features Section */}
            <section className="mb-24">
              <div className="flex justify-center mb-12">
                <Badge
                  variant="secondary"
                  className="px-4 py-1.5 text-sm font-medium rounded-full"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" data-icon="inline-start" />
                  核心能力
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {features.map((feature) => {
                  const Icon = feature.icon;
                  return (
                    <Card
                      key={feature.title}
                      className="rounded-2xl bg-surface-container-lowest auth-card-shadow p-0 overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                    >
                      <CardContent className="p-8">
                        {/* Icon */}
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                          <Icon className="w-6 h-6 text-primary" />
                        </div>

                        {/* Badge */}
                        <Badge
                          variant="outline"
                          className="mb-4 text-xs font-medium border-primary/30 text-primary"
                        >
                          {feature.badge}
                        </Badge>

                        {/* Title */}
                        <h3 className="font-headline text-xl font-bold text-on-surface mb-3">
                          {feature.title}
                        </h3>

                        {/* Description */}
                        <p className="text-sm text-on-surface-variant leading-relaxed">
                          {feature.description}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>

            {/* Tagline Section */}
            <section className="text-center mb-24">
              <Separator className="mb-16" />
              <p className="text-xl md:text-2xl font-headline font-semibold text-on-surface tracking-tight mb-4">
                Quiet Architect
              </p>
              <p className="text-base text-on-surface-variant max-w-lg mx-auto">
                让思考更专注，让记录更从容
              </p>
              <Separator className="mt-16" />
            </section>
          </div>
        </main>

        {/* Footer */}
        <footer className="py-8 border-t border-outline-variant/20">
          <div className="mx-auto max-w-5xl px-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-on-surface-variant">
              © 2024 Gotly AI. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <Link
                href="/auth/sign-in"
                className="text-sm text-on-surface-variant hover:text-primary transition-colors"
              >
                登录
              </Link>
              <Link
                href="/auth/sign-up"
                className="text-sm text-on-surface-variant hover:text-primary transition-colors"
              >
                注册
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
