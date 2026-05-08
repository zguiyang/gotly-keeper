import * as React from "react";

import { cn } from "@/lib/utils";

interface AuthCardProps {
  className?: string;
  children: React.ReactNode;
}

interface AuthHeaderProps {
  title: string;
  description?: string;
  align?: "center" | "left";
  className?: string;
}

interface AuthStatusViewProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action: React.ReactNode;
  secondaryAction?: React.ReactNode;
}

export function AuthCard({ className, children }: AuthCardProps) {
  return (
    <div
      data-slot="auth-panel"
      className={cn(
        "rounded-[1.25rem] border border-border/15 bg-surface-container-lowest/92 p-6 shadow-[var(--shadow-elevation-1)] transition-[border-color,box-shadow] duration-200 sm:p-8",
        className
      )}
    >
      {children}
    </div>
  );
}

export function AuthHeader({
  title,
  description,
  align = "center",
  className,
}: AuthHeaderProps) {
  return (
    <div
      data-slot="auth-header"
      className={cn(
        "mb-7 flex flex-col gap-2",
        align === "center" ? "text-center" : "text-left",
        className
      )}
    >
      <h1 className="font-headline text-[1.75rem] font-semibold tracking-normal text-on-surface sm:text-3xl">
        {title}
      </h1>
      {description ? (
        <p className="text-sm leading-6 text-on-surface-variant/78">{description}</p>
      ) : null}
    </div>
  );
}

export function AuthStatusView({
  title,
  description,
  icon,
  action,
  secondaryAction,
}: AuthStatusViewProps) {
  return (
    <AuthCard className="mx-auto w-full max-w-[420px]">
      <div data-slot="auth-status" className="flex flex-col items-center text-center">
        {icon ? (
          <div className="mb-6 flex size-14 items-center justify-center rounded-2xl border border-border/15 bg-muted/55 text-primary shadow-[var(--shadow-elevation-1)]">
            {icon}
          </div>
        ) : null}
        <AuthHeader title={title} description={description} className="mb-8" />
        <div className="w-full">{action}</div>
        {secondaryAction ? <div className="mt-6 w-full border-t border-border/12 pt-5">{secondaryAction}</div> : null}
      </div>
    </AuthCard>
  );
}
