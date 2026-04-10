import * as React from "react";
import { cn } from "@/lib/utils";

interface AuthBrandProps {
  className?: string;
}

export function AuthBrand({ className }: AuthBrandProps) {
  return (
    <span className={cn("font-headline text-xl font-bold tracking-tight text-on-surface", className)}>
      Gotly AI
    </span>
  );
}
