import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { ThemeProvider } from "next-themes"
import "./globals.css"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { Toaster } from "@/components/ui/sonner"
import { AuthProvider } from "@/components/auth/auth-provider"
import { NumberInputScrollProvider } from "@/components/providers/number-input-scroll-provider"
import { getCurrentUser } from "@/lib/auth"
import { DemoBanner } from "@/components/demo-banner"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

// Force all routes to be dynamic to avoid static export errors (cookies/session usage)
export const dynamic = "force-dynamic"
export const fetchCache = "force-no-store"
export const revalidate = 0

export const metadata: Metadata = {
  title: "BusinessOS - Professional Business Management Software",
  description: "Comprehensive inventory, billing, and customer management system for modern businesses",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const user = await getCurrentUser()

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans antialiased min-h-dvh overflow-x-hidden`} suppressHydrationWarning>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:text-sm focus:font-medium"
        >
          Skip to content
        </a>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <AuthProvider>
            <NumberInputScrollProvider>
              {user ? (
                // Authenticated layout
                <div className="flex h-dvh overflow-hidden">
                  <div className="print:hidden">
                    <Sidebar />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col pt-16 md:pt-0 md:ml-64 print:ml-0 print:pt-0 h-dvh overflow-hidden">
                    <div className="print:hidden hidden md:block shrink-0 sticky top-0 z-40">
                      <Header />
                    </div>
                    <main id="main-content" className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden bg-muted/30 print:bg-white print:overflow-visible">
                      {children}
                    </main>
                  </div>
                </div>
              ) : (
                // Unauthenticated layout (for login/signup pages)
                <main className="min-h-screen overflow-y-auto">{children}</main>
              )}
            </NumberInputScrollProvider>
            <DemoBanner />
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
