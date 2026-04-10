import * as React from "react";
import Link from "next/link";
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
          "mx-auto flex w-full items-center text-[#54647a]",
          compact
            ? "max-w-5xl flex-col gap-3 text-center"
            : "max-w-7xl flex-col gap-4 md:flex-row md:justify-between"
        )}
      >
        <div className={cn(compact ? "text-center" : "mb-0")}>
          <span className="text-sm font-semibold">Gotly AI</span>
          <p className="mt-1 text-xs leading-relaxed opacity-70">
            © 2024 Gotly AI. The Digital Curator.
          </p>
        </div>
        <div className="flex gap-8 text-xs tracking-wide">
          <Link className="opacity-70 transition-opacity hover:text-primary hover:opacity-100" href="/privacy">
            Privacy
          </Link>
          <Link className="opacity-70 transition-opacity hover:text-primary hover:opacity-100" href="/terms">
            Terms
          </Link>
          <Link className="opacity-70 transition-opacity hover:text-primary hover:opacity-100" href="/support">
            Support
          </Link>
        </div>
      </div>
    </footer>
  );
}
