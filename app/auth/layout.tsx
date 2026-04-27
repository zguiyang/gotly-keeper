import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Authentication - Gotly Keeper",
  description: "Sign in or create an account to continue",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
