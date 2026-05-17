"use client";

import { motion } from "motion/react";

import { featureCards } from "@/config/landing-page-content";

const EASE = [0.16, 1, 0.3, 1] as const;

export function FeatureList() {
  return (
    <motion.div
      className="flex flex-col border-t border-border/8"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.1 }}
      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }}
    >
      {featureCards.map((feature, i) => {
        const Icon = feature.icon;
        return (
          <motion.article
            key={feature.title}
            variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } } }}
            className="grid grid-cols-[3rem_1fr_auto] items-start gap-8 border-b border-border/8 py-8 transition-colors hover:bg-muted/20"
          >
            <span className="pt-0.5 text-[0.72rem] font-semibold tracking-[0.1em] text-on-surface-variant/50">
              0{i + 1}
            </span>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-3.5 w-3.5 text-primary" />
                </span>
                <h3 className="text-base font-semibold tracking-tight text-on-surface">
                  {feature.subtitle}
                </h3>
              </div>
              <p className="text-sm leading-relaxed text-on-surface-variant max-w-[36rem]">
                {feature.description}
              </p>
            </div>
            <p className="max-w-[16rem] text-right text-[0.8125rem] italic text-on-surface-variant opacity-60 pt-0.5">
              {feature.example}
            </p>
          </motion.article>
        );
      })}
    </motion.div>
  );
}
