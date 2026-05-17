"use client";

import { motion, type Variants } from "motion/react";
import { type ReactNode } from "react";

type RevealVariant = "fade-up" | "fade-in" | "scale-in" | "slide-left" | "slide-right";

const VARIANTS: Record<RevealVariant, Variants> = {
  "fade-up":     { hidden: { opacity: 0, y: 24 },       visible: { opacity: 1, y: 0 } },
  "fade-in":     { hidden: { opacity: 0 },              visible: { opacity: 1 } },
  "scale-in":    { hidden: { opacity: 0, scale: 0.95 }, visible: { opacity: 1, scale: 1 } },
  "slide-left":  { hidden: { opacity: 0, x: -24 },      visible: { opacity: 1, x: 0 } },
  "slide-right": { hidden: { opacity: 0, x: 24 },       visible: { opacity: 1, x: 0 } },
};

const EASE = [0.16, 1, 0.3, 1] as const;

type ScrollRevealProps = {
  children: ReactNode;
  variant?: RevealVariant;
  delay?: number;
  duration?: number;
  className?: string;
  as?: "div" | "section" | "article" | "span";
};

export function ScrollReveal({
  children,
  variant = "fade-up",
  delay = 0,
  duration = 500,
  className,
  as: Tag = "div",
}: ScrollRevealProps) {
  const MotionTag = motion[Tag];
  return (
    <MotionTag
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.08 }}
      variants={VARIANTS[variant]}
      transition={{ duration: duration / 1000, delay: delay / 1000, ease: EASE }}
    >
      {children}
    </MotionTag>
  );
}
