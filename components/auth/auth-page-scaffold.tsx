import * as React from "react";

import { AuthPageFooter } from "@/components/auth/auth-footer";
import { AuthNavbar } from "@/components/auth/auth-navbar";
import { AuthShell } from "@/components/auth/auth-shell";

interface AuthPageScaffoldProps {
  children: React.ReactNode;
  mainClassName: string;
  contentClassName?: string;
  withFooter?: boolean;
  helpLabel?: string;
}

export function AuthPageScaffold({
  children,
  mainClassName,
  contentClassName,
  withFooter = true,
  helpLabel,
}: AuthPageScaffoldProps) {
  return (
    <AuthShell>
      <AuthNavbar helpLabel={helpLabel} />

      <main className={mainClassName}>
        {contentClassName ? <div className={contentClassName}>{children}</div> : children}
      </main>

      {withFooter ? <AuthPageFooter /> : null}
    </AuthShell>
  );
}
