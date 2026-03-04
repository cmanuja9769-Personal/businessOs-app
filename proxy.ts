import { type NextRequest, NextResponse } from "next/server"
import { updateSession } from "@/lib/supabase/proxy"

const PUBLIC_ROUTES = new Set([
  "/auth/login",
  "/auth/signup",
  "/auth/reset-password",
  "/auth/callback",
  "/auth/confirm",
  "/demo",
  "/unauthorized",
])

function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_ROUTES.has(pathname)) return true
  if (pathname.startsWith("/api/auth/")) return true
  if (pathname.startsWith("/auth/")) return true
  if (pathname.startsWith("/_next/")) return true
  if (pathname.startsWith("/api/webhooks")) return true
  if (pathname === "/favicon.ico") return true
  if (pathname.startsWith("/fonts/")) return true
  return false
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (isPublicRoute(pathname)) {
    return updateSession(request)
  }

  const response = await updateSession(request)

  const hasSession =
    request.cookies.has("sb-access-token") ||
    request.cookies.getAll().some((c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token"))

  const isDemoMode = request.cookies.get("businessos_demo")?.value === "1"

  if (!hasSession && !isDemoMode) {
    const loginUrl = new URL("/auth/login", request.url)
    loginUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon-light-32x32.png|icon-dark-32x32.png|icon.svg|apple-icon.png|manifest\\.webmanifest|fonts|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
}
