import { CheckCircle } from "lucide-react";
import Link from "next/link";

import { AuthStatusView } from "@/components/auth/auth-card";
import { AuthPageScaffold } from "@/components/auth/auth-page-scaffold";
import { Button, buttonVariants } from "@/components/ui/button";
import { getServerTranslation } from "@/hooks/use-locale.server";
import { cn } from "@/lib/utils";

export default async function ResetLinkSentPage() {
  const t = await getServerTranslation("auth.resetLinkSent");

  return (
    <AuthPageScaffold
      mainClassName="flex flex-1 items-center justify-center px-6 py-12 sm:py-16"
      withFooter={false}
    >
      <AuthStatusView
        title={t("title")}
        description={t("description")}
        icon={<CheckCircle className="size-7" strokeWidth={1.8} />}
        action={
          <Link
            className={cn(buttonVariants({ size: "lg" }), "h-10 w-full rounded-xl text-sm")}
            href="/auth/sign-in"
          >
            {t("backToSignIn")}
          </Link>
        }
        secondaryAction={
          <p className="font-body text-sm text-on-surface-variant">
            {t("resendPrompt")}
            <Button
              type="button"
              variant="link"
              className="ml-1 h-auto px-0 text-sm"
            >
              {t("resendButton")}
            </Button>
          </p>
        }
      />
    </AuthPageScaffold>
  );
}
