import type { Metadata } from "next";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/manrope/400.css";
import "@fontsource/manrope/500.css";
import "@fontsource/manrope/600.css";
import "@fontsource/manrope/700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gotly AI",
  description:
    "Gotly AI is a lightweight AI-powered capture tool for collecting, refining, and retrieving ideas.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="light">
      <body
        className="font-inter font-manrope min-h-full flex flex-col antialiased"
      >
        {/* TODO: Global ThemeProvider */}
        {/* TODO: Global Context Providers (e.g., User, Theme, etc.) */}
        {children}
      </body>
    </html>
  );
}
