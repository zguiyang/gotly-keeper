"use client"

import { ThemeProvider as NextThemesProvider } from "next-themes"

import type { ComponentProps } from "react"
type ThemeProviderProps = ComponentProps<typeof NextThemesProvider>

function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}

export { ThemeProvider }
