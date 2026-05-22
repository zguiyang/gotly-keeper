import type { Metadata } from "next";
import { getServerTranslation } from "@/hooks/use-locale.server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerTranslation("auth.layout");
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
