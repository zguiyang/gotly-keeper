import * as React from "react";

import { AuthPageFooter } from "@/components/auth/auth-footer";
import { AuthNavbar } from "@/components/auth/auth-navbar";
import { AuthShell } from "@/components/auth/auth-shell";

interface AuthPageScaffoldProps {
  children: React.ReactNode;
  mainClassName: string;
  contentClassName?: string;
  withFooter?: boolean;
}

export function AuthPageScaffold({
  children,
  mainClassName,
  contentClassName,
  withFooter = true,
}: AuthPageScaffoldProps) {
  return (
    <AuthShell>
      <AuthNavbar />

      <main className={mainClassName}>
        {contentClassName ? <div className={contentClassName}>{children}</div> : children}
      </main>

      {withFooter ? <AuthPageFooter /> : null}
    </AuthShell>
  );
}
