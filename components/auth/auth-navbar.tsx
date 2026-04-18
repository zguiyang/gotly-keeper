import { CircleHelp, Archive } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

interface AuthNavbarProps {
  className?: string;
}

export function AuthNavbar({ className }: AuthNavbarProps) {
  return (
    <header className={cn("flex w-full items-center justify-between px-8 pt-6", className)}>
      <div className="flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-container text-on-primary">
          <Archive className="h-5 w-5" fill="currentColor" />
        </div>
        <span className="font-headline text-xl font-bold tracking-tighter text-on-surface">
          Gotly AI
        </span>
      </div>
      <button
        className="rounded-lg p-2 text-[#54647a] transition-colors hover:bg-surface-container-low hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        aria-label="帮助与反馈"
      >
        <CircleHelp className="h-5 w-5" strokeWidth={2} />
      </button>
    </header>
  );
}
