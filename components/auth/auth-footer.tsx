import * as React from "react";

import { BrandLogo } from "@/components/brand-logo";
import { cn } from "@/lib/utils";

interface AuthPageFooterProps {
  className?: string;
  compact?: boolean;
}

export function AuthPageFooter({ className, compact = false }: AuthPageFooterProps) {
  return (
    <footer
      className={cn(
        "w-full bg-transparent",
        compact ? "px-8 py-6" : "px-12 py-8",
        className
      )}
    >
      <div
        className={cn(
          "mx-auto flex w-full items-center text-on-surface-variant",
          compact
            ? "max-w-5xl flex-col gap-3 text-center"
            : "max-w-7xl flex-col gap-4 md:flex-row md:justify-between"
        )}
      >
        <div className={cn(compact ? "text-center mx-auto" : "mb-0")}>
          <BrandLogo className="h-8" />
        </div>
      </div>
    </footer>
  );
}
