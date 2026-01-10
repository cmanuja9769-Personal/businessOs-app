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
  maximumScale: 1,
  userScalable: false,
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const user = await getCurrentUser()

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans antialiased h-screen overflow-hidden`} suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <AuthProvider>
            <NumberInputScrollProvider>
              {user ? (
                // Authenticated layout
                <div className="flex h-screen overflow-hidden">
                  <div className="print:hidden">
                    <Sidebar />
                  </div>
                  <div className="flex-1 flex flex-col overflow-hidden pt-16 md:pt-0 md:ml-64 print:ml-0 print:pt-0">
                    <div className="print:hidden hidden md:block">
                      <Header />
                    </div>
                    <main className="flex-1 overflow-y-auto bg-muted/30 print:bg-white print:overflow-visible">
                      {children}
                    </main>
                  </div>
                </div>
              ) : (
                // Unauthenticated layout (for login/signup pages)
                <main className="min-h-screen overflow-y-auto">{children}</main>
              )}
            </NumberInputScrollProvider>
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
