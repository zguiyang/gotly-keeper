import Link from "next/link";

import { AuthCard, AuthHeader } from "@/components/auth/auth-card";
import { AuthDivider } from "@/components/auth/auth-divider";
import { AuthPageScaffold } from "@/components/auth/auth-page-scaffold";
import { SignInForm } from "@/components/auth/sign-in-form";
import { SignInWithGithubButton } from "@/components/auth/sign-in-with-github-button";
import { getServerTranslation } from "@/hooks/use-locale.server";
import { cn } from "@/lib/utils";

export default async function SignInPage() {
  const t = await getServerTranslation("auth.signIn");

  return (
    <AuthPageScaffold
      contentClassName="w-full max-w-[440px]"
      mainClassName="flex flex-1 items-center justify-center px-6 py-12 sm:py-16"
      withFooter={false}
      helpLabel={t("submitLabel")}
    >
      <AuthCard>
        <AuthHeader title={t("title")} description={t("description")} />

        <SignInForm />

        <AuthDivider className="my-6" text={t("divider")} />

        <SignInWithGithubButton label={t("githubSignIn")} pendingLabel={t("submittingLabel")} />

        <div className="mt-7 text-center">
          <p className={cn("text-sm text-on-surface-variant")}>
            {t("noAccount")}{" "}
            <Link
              href="/auth/sign-up"
              className="font-semibold text-primary underline-offset-4 transition-colors duration-150 hover:text-primary-dim hover:underline"
            >
              {t("signUpLink")}
            </Link>
          </p>
        </div>
      </AuthCard>
    </AuthPageScaffold>
  );
}
