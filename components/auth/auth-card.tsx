import * as React from "react";
import { cn } from "@/lib/utils";

interface AuthCardProps {
  className?: string;
  children: React.ReactNode;
}

export function AuthCard({ className, children }: AuthCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl bg-surface-container-lowest p-10 auth-card-shadow",
        className
      )}
    >
      {children}
    </div>
  );
}
