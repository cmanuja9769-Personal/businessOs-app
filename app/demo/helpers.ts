import { cookies } from "next/headers"
import type { AuthContext } from "@/lib/authorize"
import { DEFAULT_PERMISSIONS } from "@/lib/permissions"

export const DEMO_COOKIE_NAME = "businessos_demo"
export const DEMO_ORG_ID = "d0000000-0000-4000-a000-000000000001"
export const DEMO_USER_ID = "d0000000-0000-4000-a000-000000000002"
export const DEMO_ORG_NAME = "TechMart Solutions"

export async function isDemoMode(): Promise<boolean> {
  try {
    const cookieStore = await cookies()
    return cookieStore.get(DEMO_COOKIE_NAME)?.value === "1"
  } catch {
    return false
  }
}

export function getDemoAuthContext(): AuthContext {
  return {
    supabase: null as unknown as AuthContext["supabase"],
    userId: DEMO_USER_ID,
    organizationId: DEMO_ORG_ID,
    role: "admin",
    permissions: DEFAULT_PERMISSIONS.admin,
  }
}

export function throwDemoMutationError(): never {
  throw new Error("Demo mode: Changes are not saved. Sign up to start using BusinessOS!")
}
