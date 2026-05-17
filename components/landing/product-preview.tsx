"use client";

import { motion } from "motion/react";

const MESSAGES = [
  { role: "user", text: "明天下午记得发报价给李总" },
  { role: "ai",   text: "已记录为待办，时间：明天下午。" },
  { role: "user", text: "https://example.com/ai-paper 这个后面看" },
  { role: "ai",   text: "已收藏为书签。" },
  { role: "user", text: "我最近记过关于定价的内容吗" },
  { role: "ai",   text: "找到 3 条相关记录：定价策略笔记、报价待办、竞品定价书签。" },
];

const EASE = [0.16, 1, 0.3, 1] as const;

export function ProductPreview() {
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
        {MESSAGES.map((msg, i) => (
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
          <span className="flex-1 text-[0.8125rem] text-on-surface-variant/50">随手记一句话…</span>
          <span className="h-5 w-5 rounded-md bg-primary opacity-80" />
        </div>
      </div>
    </div>
  );
}
