import { createClient } from "@/lib/supabase/server"
import { DEFAULT_PERMISSIONS, hasPermission, type UserRole, type Permissions } from "@/lib/permissions"
import { isDemoMode, getDemoAuthContext } from "@/app/demo/helpers"

export interface AuthContext {
  readonly supabase: Awaited<ReturnType<typeof createClient>>
  readonly userId: string
  readonly organizationId: string
  readonly role: UserRole
  readonly permissions: Permissions
}

export function orgScope(organizationId: string): string {
  return `organization_id.eq.${organizationId}`
}

export async function authorize(
  resource?: keyof Permissions,
  action?: "create" | "read" | "update" | "delete",
): Promise<AuthContext> {
  if (await isDemoMode()) {
    return getDemoAuthContext()
  }

  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error("Unauthorized: not authenticated")
  }

  const { data: orgData } = await supabase
    .from("app_user_organizations")
    .select("organization_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle()

  if (!orgData?.organization_id) {
    throw new Error("Unauthorized: no active organization")
  }

  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle()

  const role = (roleData?.role as UserRole) || "viewer"
  const permissions = DEFAULT_PERMISSIONS[role]

  if (resource && action && !hasPermission(permissions, resource, action)) {
    throw new Error(`Forbidden: insufficient permissions for ${action} on ${resource}`)
  }

  return {
    supabase,
    userId: user.id,
    organizationId: orgData.organization_id,
    role,
    permissions,
  }
}
