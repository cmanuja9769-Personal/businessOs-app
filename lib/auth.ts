import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { User } from "@supabase/supabase-js"

/**
 * Get the current authenticated user
 */
export async function getCurrentUser(): Promise<User | null> {
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

/**
 * Get user's role from database
 */
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

  if (error) {
    // Only log unexpected errors (not "not found" errors)
    if (error.code !== "PGRST116") {
      console.error("[v0] Error fetching user role:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        userId,
      })
    } else {
      // User doesn't have a role yet - try to create one
      console.log("[v0] User has no role, attempting to create default role for user:", userId)

      try {
        // Check if this is the first user (make them admin)
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

        if (!insertError && newRole) {
          console.log("[v0] Created user role:", defaultRole, "for user:", userId)
          return newRole
        } else if (insertError) {
          console.error("[v0] Failed to create user role:", insertError.message)
        }
      } catch (createError) {
        console.error("[v0] Exception creating user role:", createError)
      }
    }

    // Return default user role if table doesn't exist or user not found
    return { role: "user", permissions: null }
  }

  return data
}

/**
 * Log activity for audit trail
 */
export async function logActivity(
  userId: string,
  action: string,
  resourceType: string,
  resourceId?: string,
  details?: Record<string, any>,
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
