"use client";

import { motion } from "motion/react";

import { useTranslations } from "@/hooks/use-locale";

const EASE = [0.16, 1, 0.3, 1] as const;

export function ProductPreview() {
  const t = useTranslations("landing.demo");
  const messages = t("messages") as unknown as { role: string; text: string }[];
  return (
    <div className="relative rounded-2xl border border-border/9 bg-surface-container-lowest overflow-hidden shadow-[var(--shadow-elevation-1)]">
      {/* Window chrome */}
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border/7">
        <span className="h-2.5 w-2.5 rounded-full bg-muted/55" />
        <span className="h-2.5 w-2.5 rounded-full bg-muted/55" />
        <span className="h-2.5 w-2.5 rounded-full bg-muted/55" />
        <span className="ml-3 text-[0.7rem] text-on-surface-variant opacity-50 tracking-wide">Gotly Keeper</span>
      </div>

      {/* Messages */}
      <div className="flex flex-col gap-3 p-5">
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.18, duration: 0.45, ease: EASE }}
            className={msg.role === "user" ? "flex justify-end" : "flex justify-start"}
          >
            {msg.role === "ai" && (
              <span className="mr-2 mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/12 text-[0.6rem] font-bold text-primary">G</span>
            )}
            <p
              className={[
                "max-w-[80%] rounded-xl px-3.5 py-2 text-[0.8125rem] leading-relaxed",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-muted/30 text-on-surface rounded-bl-sm",
              ].join(" ")}
            >
              {msg.text}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Input bar */}
      <div className="border-t border-border/7 px-4 py-3">
        <div className="flex items-center gap-2 rounded-lg bg-muted/30 px-3.5 py-2.5">
          <span className="flex-1 text-[0.8125rem] text-on-surface-variant/50">{t("inputPlaceholder")}</span>
          <span className="h-5 w-5 rounded-md bg-primary opacity-80" />
        </div>
      </div>
    </div>
  );
}
