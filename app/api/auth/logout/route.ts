import { createServerClient } from "@supabase/ssr"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const req = request as any
  // Prepare a NextResponse to set cookie headers
  const res = NextResponse.json({ ok: true })

  try {
    const url = new URL(request.url)

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            // @ts-ignore - running in Edge runtime, use Request cookies
            return req.cookies.getAll()
          },
          setAll(cookiesToSet: Array<any>) {
            cookiesToSet.forEach(({ name, value, options }: any) => {
              try {
                res.cookies.set(name, value, options)
              } catch (e) {
                // ignore
              }
            })
          },
        },
      },
    )

    // Attempt to sign out via Supabase server client
    try {
      await supabase.auth.signOut()
    } catch (e) {
      // ignore
    }

    // Clear common Supabase cookie names in the response
    try {
      // @ts-ignore
      const allCookies = req.cookies.getAll()
      allCookies.forEach((c: any) => {
        const name: string = c.name || c.key || ""
        if (
          name.startsWith("sb-") ||
          name.includes("supabase") ||
          name.includes("access_token") ||
          name.includes("refresh_token") ||
          name.includes("session")
        ) {
          try {
            res.cookies.set(name, "", { maxAge: 0, path: "/" })
          } catch (e) {}
        }
      })
    } catch (e) {
      // ignore
    }

    // Also set common session cookies to expired just in case
    try {
      res.cookies.set("sb-access-token", "", { maxAge: 0, path: "/" })
      res.cookies.set("sb-refresh-token", "", { maxAge: 0, path: "/" })
      res.cookies.set("supabase-auth-token", "", { maxAge: 0, path: "/" })
    } catch (e) {}

    return res
  } catch (err) {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
