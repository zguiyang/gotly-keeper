import * as React from "react";
import { cn } from "@/lib/utils";

interface AuthDividerProps {
  className?: string;
  text?: string;
}

export function AuthDivider({ className, text = "其他方式" }: AuthDividerProps) {
  return (
    <div className={cn("flex items-center gap-4", className)}>
      <div className="h-px flex-1 bg-outline-variant/20" />
      <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-outline">
        {text}
      </span>
      <div className="h-px flex-1 bg-outline-variant/20" />
    </div>
  );
}

export function AuthDividerWithText({
  text = "其他方式",
  className,
}: AuthDividerProps) {
  return <AuthDivider text={text} className={className} />;
}
