import { CircleHelp, Archive } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AuthNavbarProps {
  className?: string;
}

export function AuthNavbar({ className }: AuthNavbarProps) {
  return (
    <header className={cn("flex w-full items-center justify-between px-8 pt-6", className)}>
      <div className="flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-container text-on-primary-container">
          <Archive className="h-5 w-5" fill="currentColor" />
        </div>
        <span className="font-headline text-xl font-bold tracking-tighter text-on-surface">
          Gotly AI
        </span>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="text-on-surface-variant hover:text-on-surface"
        aria-label="帮助与反馈"
      >
        <CircleHelp strokeWidth={2} />
      </Button>
    </header>
  );
}
