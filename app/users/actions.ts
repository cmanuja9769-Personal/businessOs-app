"use server"

import { revalidatePath } from "next/cache"
import { authorize } from "@/lib/authorize"
import { isDemoMode, throwDemoMutationError } from "@/app/demo/helpers"

export async function updateUserRole(userId: string, role: "admin" | "salesperson" | "accountant" | "viewer") {
  if (await isDemoMode()) throwDemoMutationError()
  try {
    const { supabase, organizationId, role: callerRole } = await authorize("settings", "update")

    if (callerRole !== "admin") {
      return { success: false, error: "Only admins can change user roles" }
    }

    const { data: targetUserOrg } = await supabase
      .from("app_user_organizations")
      .select("organization_id")
      .eq("user_id", userId)
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .maybeSingle()

    if (!targetUserOrg) {
      return { success: false, error: "User does not belong to your organization" }
    }

    const { error } = await supabase.from("user_roles").update({ role }).eq("user_id", userId)

    if (error) {
      console.error("[v0] Error updating user role:", error)
      return { success: false, error: error.message }
    }

    revalidatePath("/users")
    return { success: true }
  } catch (error) {
    console.error("[v0] Error in updateUserRole:", error)
    return { success: false, error: "An error occurred" }
  }
}
