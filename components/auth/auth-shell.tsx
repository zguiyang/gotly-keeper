import * as React from "react";

import { cn } from "@/lib/utils";

import styles from "./auth-shell.module.css";

interface AuthShellProps {
  children: React.ReactNode;
  className?: string;
}

export function AuthShell({ children, className }: AuthShellProps) {
  return (
    <div className={styles.shell}>
      <div className={cn("relative flex min-h-screen flex-col", className)}>{children}</div>
    </div>
  );
}
