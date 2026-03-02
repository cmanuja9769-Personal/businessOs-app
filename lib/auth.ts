import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { User, SupabaseClient } from "@supabase/supabase-js"
import { isDemoMode, DEMO_USER_ID } from "@/app/demo/helpers"

export async function getCurrentUser(): Promise<User | null> {
  if (await isDemoMode()) {
    return {
      id: DEMO_USER_ID,
      email: "demo@businessos.app",
      app_metadata: {},
      user_metadata: { full_name: "Demo User" },
      aud: "authenticated",
      created_at: new Date().toISOString(),
    } as User
  }

  const supabase = await createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: async () => (await cookies()).getAll(),
        setAll: async (cookiesToSet) => {
          const cookieStore = await cookies()
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  return user || null
}

async function tryCreateDefaultRole(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ role: string; permissions: Record<string, unknown> | null } | null> {
  try {
    const { data: existingRoles } = await supabase.from("user_roles").select("id").limit(1)
    const isFirstUser = !existingRoles || existingRoles.length === 0
    const defaultRole = isFirstUser ? "admin" : "user"

    const { data: newRole, error: insertError } = await supabase
      .from("user_roles")
      .insert({
        user_id: userId,
        role: defaultRole,
        permissions: {},
      })
      .select("role, permissions")
      .single()

    if (!insertError && newRole) return newRole
  } catch {
    return null
  }
  return null
}

export async function getUserRole(userId: string) {
  const supabase = await createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: async () => (await cookies()).getAll(),
        setAll: async (cookiesToSet) => {
          const cookieStore = await cookies()
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    },
  )

  const { data, error } = await supabase.from("user_roles").select("role, permissions").eq("user_id", userId).single()

  if (!error) return data

  if (error.code !== "PGRST116") {
    console.error("[v0] Error fetching user role:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      userId,
    })
    return { role: "user", permissions: null }
  }

  const newRole = await tryCreateDefaultRole(supabase, userId)
  return newRole ?? { role: "user", permissions: null }
}

/**
 * Log activity for audit trail
 */
export async function logActivity(
  userId: string,
  action: string,
  resourceType: string,
  resourceId?: string,
  details?: Record<string, unknown>,
  ipAddress?: string,
  userAgent?: string,
) {
  const supabase = await createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: async () => (await cookies()).getAll(),
        setAll: async (cookiesToSet) => {
          const cookieStore = await cookies()
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    },
  )

  await supabase.from("activity_logs").insert({
    user_id: userId,
    action,
    resource_type: resourceType,
    resource_id: resourceId || null,
    details: details || {},
    ip_address: ipAddress || null,
    user_agent: userAgent || null,
  })
}
