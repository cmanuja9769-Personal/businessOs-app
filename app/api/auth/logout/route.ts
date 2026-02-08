import { createServerClient } from "@supabase/ssr"
import { type NextRequest, NextResponse } from "next/server"

interface CookieToSet {
  name: string
  value: string
  options?: Record<string, unknown>
}

interface RequestCookie {
  name?: string
  key?: string
}

export async function POST(request: NextRequest) {
  const res = NextResponse.json({ ok: true })

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet: Array<CookieToSet>) {
            cookiesToSet.forEach(({ name, value, options }: CookieToSet) => {
              try {
                res.cookies.set(name, value, options)
              } catch {
                /* cookie set not critical */
              }
            })
          },
        },
      },
    )

    try {
      await supabase.auth.signOut()
    } catch {
      /* sign out best-effort */
    }

    try {
      const allCookies = request.cookies.getAll()
      allCookies.forEach((c: RequestCookie) => {
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
          } catch {
            /* cookie cleanup not critical */
          }
        }
      })
    } catch {
      /* cookie cleanup not critical */
    }

    try {
      res.cookies.set("sb-access-token", "", { maxAge: 0, path: "/" })
      res.cookies.set("sb-refresh-token", "", { maxAge: 0, path: "/" })
      res.cookies.set("supabase-auth-token", "", { maxAge: 0, path: "/" })
    } catch {
      /* cookie cleanup not critical */
    }

    return res
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
