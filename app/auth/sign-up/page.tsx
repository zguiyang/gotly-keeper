import Link from "next/link";

import { AuthCard, AuthHeader } from "@/components/auth/auth-card";
import { AuthDivider } from "@/components/auth/auth-divider";
import { AuthPageScaffold } from "@/components/auth/auth-page-scaffold";
import { SignInWithGithubButton } from "@/components/auth/sign-in-with-github-button";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { getServerTranslation } from "@/hooks/use-locale.server";
import { cn } from "@/lib/utils";
import { isGithubAuthEnabled } from "@/server/modules/auth";

export default async function SignUpPage() {
  const t = await getServerTranslation("auth.signUp");
  const githubAuthEnabled = isGithubAuthEnabled()

  return (
    <AuthPageScaffold
      contentClassName="w-full max-w-[440px]"
      mainClassName="flex flex-1 items-center justify-center px-6 py-12 sm:py-16"
      withFooter={false}
      helpLabel={t("submitLabel")}
    >
      <AuthCard>
        <AuthHeader title={t("title")} description={t("description")} />

        <SignUpForm />

        <div className="mt-5 text-center">
          <p className={cn("text-sm text-on-surface-variant")}>
            {t("hasAccount")}{" "}
            <Link
              className="font-semibold text-primary underline-offset-4 transition-colors duration-150 hover:text-primary-dim hover:underline"
              href="/auth/sign-in"
            >
              {t("signInLink")}
            </Link>
          </p>
        </div>

        {githubAuthEnabled ? (
          <>
            <AuthDivider className="my-6" text={t("divider")} />
            <SignInWithGithubButton label={t("githubSignUp")} pendingLabel={t("submittingLabel")} />
          </>
        ) : null}
      </AuthCard>
    </AuthPageScaffold>
  );
}
