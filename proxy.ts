import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

const AUTH_LOGIN = "/auth/login"
const AUTH_ACCEPT_INVITE = "/auth/accept-invite"
const ONBOARDING = "/onboarding"

const PUBLIC_ROUTES = [
  AUTH_LOGIN,
  "/auth/signup",
  "/auth/callback",
  "/auth/forgot-password",
  "/auth/reset-password",
  AUTH_ACCEPT_INVITE,
  "/demo",
]

const AUTH_ROUTES = [AUTH_LOGIN, "/auth/signup", "/auth/forgot-password"]

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname.startsWith(route))
}

function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some((route) => pathname.startsWith(route))
}

function isStaticOrApiRoute(pathname: string): boolean {
  return (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/icon") ||
    pathname.startsWith("/apple-icon") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".ico")
  )
}

function createSupabaseMiddlewareClient(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  return { supabase, getResponse: () => supabaseResponse }
}

async function handleOrgGate(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  userId: string,
  userEmail: string,
  pathname: string,
  requestUrl: string,
): Promise<NextResponse | null> {
  const { data: orgMembership } = await supabase
    .from("app_user_organizations")
    .select("organization_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle()

  if (orgMembership) return null

  const { data: pendingInvite } = await supabase
    .from("organization_invitations")
    .select("id")
    .eq("email", userEmail)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString())
    .limit(1)
    .maybeSingle()

  if (pendingInvite && pathname !== AUTH_ACCEPT_INVITE) {
    return NextResponse.redirect(new URL(AUTH_ACCEPT_INVITE, requestUrl))
  }

  if (!pendingInvite && pathname !== ONBOARDING) {
    return NextResponse.redirect(new URL(ONBOARDING, requestUrl))
  }

  return null
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (isStaticOrApiRoute(pathname) || pathname.startsWith("/demo")) {
    return NextResponse.next()
  }

  const { supabase, getResponse } = createSupabaseMiddlewareClient(request)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && !isPublicRoute(pathname)) {
    const loginUrl = new URL(AUTH_LOGIN, request.url)
    loginUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (user && isAuthRoute(pathname)) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  if (user && !isPublicRoute(pathname) && pathname !== ONBOARDING) {
    const redirect = await handleOrgGate(supabase, user.id, user.email!, pathname, request.url)
    if (redirect) return redirect
  }

  return getResponse()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
