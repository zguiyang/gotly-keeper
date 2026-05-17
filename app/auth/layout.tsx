import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "认证 - Gotly Keeper",
  description: "登录或创建账号以继续",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
