import { CircleHelp } from "lucide-react";
import * as React from "react";

import { BrandLogo } from "@/components/brand-logo";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AuthNavbarProps {
  className?: string;
  helpLabel?: string;
}

export function AuthNavbar({ className, helpLabel }: AuthNavbarProps) {
  return (
    <header className={cn("flex w-full items-center justify-between px-8 pt-6", className)}>
      <div className="flex items-center">
        <BrandLogo className="h-10" />
      </div>
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="rounded-full text-on-surface-variant hover:text-on-surface"
          aria-label={helpLabel ?? "Help & Feedback"}
        >
          <CircleHelp strokeWidth={2} />
        </Button>
        <LanguageSwitcher />
      </div>
    </header>
  );
}
