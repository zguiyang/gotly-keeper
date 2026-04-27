import * as React from "react";

import { BrandLogo } from "@/components/brand-logo";
import { cn } from "@/lib/utils";

interface AuthBrandProps {
  className?: string;
}

export function AuthBrand({ className }: AuthBrandProps) {
  return <BrandLogo className={cn("h-10", className)} />;
}
