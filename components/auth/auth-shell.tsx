import * as React from "react";
import { cn } from "@/lib/utils";

interface AuthShellProps {
  children: React.ReactNode;
  className?: string;
}

export function AuthShell({ children, className }: AuthShellProps) {
  return (
    <div className="auth-atmosphere min-h-screen">
      <div className={cn("relative flex min-h-screen flex-col", className)}>{children}</div>
    </div>
  );
}
