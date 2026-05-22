"use client";

import { motion } from "motion/react";
import { Bookmark, Brain, FileText, Search, type LucideIcon } from "lucide-react";

const EASE = [0.16, 1, 0.3, 1] as const;

const ICON_MAP: Record<string, LucideIcon> = {
  quickCapture: FileText,
  saveLinks: Bookmark,
  timeReminders: Brain,
  naturalSearch: Search,
};

export type FeatureItem = {
  icon: string;
  title: string;
  desc: string;
};

type FeatureListProps = {
  features: FeatureItem[];
};

export function FeatureList({ features }: FeatureListProps) {
  return (
    <motion.div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.1 }}
      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }}
    >
      {features.map((feature) => {
        const Icon = ICON_MAP[feature.icon];
        return (
          <motion.div
            key={feature.title}
            variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } } }}
            className="flex flex-col gap-3 rounded-lg border border-border/8 bg-surface-container-lowest p-6"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              {Icon && <Icon className="h-4 w-4 text-primary" />}
            </span>
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-semibold tracking-tight text-on-surface">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-on-surface-variant">{feature.desc}</p>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
