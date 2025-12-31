"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getCurrentUser, getUserRole } from "@/lib/auth"

export async function updateUserRole(userId: string, role: "admin" | "salesperson" | "accountant" | "viewer") {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return { success: false, error: "Not authenticated" }
    }

    // Check if current user is admin
    const userRole = await getUserRole(currentUser.id)
    if (!userRole || userRole.role !== "admin") {
      return { success: false, error: "Only admins can change user roles" }
    }

    const supabase = await createClient()

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
