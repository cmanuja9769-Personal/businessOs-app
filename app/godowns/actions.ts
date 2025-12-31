"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getCurrentOrganization } from "@/lib/organizations"

export type Godown = {
  id: string
  name: string
  code: string
  isDefault: boolean
}

async function getActiveOrganizationId(): Promise<string | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()

  if (error || !data?.user) {
    console.error("[godowns] No authenticated user")
    return null
  }

  const org = await getCurrentOrganization(data.user.id)
  if (!org) {
    console.error("[godowns] getCurrentOrganization returned null for user:", data.user.id)
    return null
  }

  // `getCurrentOrganization` can be typed as an array depending on Supabase inference.
  const resolved = Array.isArray(org) ? org[0] : org
  const orgId = resolved?.id ?? null
  
  if (!orgId) {
    console.error("[godowns] Organization has no ID:", resolved)
  } else {
    console.log("[godowns] Found organization ID:", orgId)
  }
  
  return orgId
}

export async function getGodowns(): Promise<Godown[]> {
  const organizationId = await getActiveOrganizationId()
  if (!organizationId) return []

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("warehouses")
    .select("id,name,code,is_default")
    .eq("organization_id", organizationId)
    .order("is_default", { ascending: false })
    .order("name", { ascending: true })

  if (error) {
    // Fail-soft: RLS recursion or missing table should not block page load.
    // Only log if this is not the typical RLS recursion error (42P17).
    const anyErr = error as any
    if (anyErr?.code !== "42P17") {
      console.error("[v0] Error fetching godowns:", {
        code: anyErr?.code,
        message: anyErr?.message,
        details: anyErr?.details,
        hint: anyErr?.hint,
      })
    }
    return []
  }

  return (
    data?.map((w: any) => ({
      id: w.id,
      name: w.name,
      code: w.code,
      isDefault: Boolean(w.is_default),
    })) ?? []
  )
}

function makeGodownCode(nextNumber: number) {
  return `GDN${String(nextNumber).padStart(4, "0")}`
}

export async function createGodown(name: string) {
  const trimmed = (name ?? "").trim()
  if (trimmed.length < 1) return { success: false as const, error: "Godown name is required" }

  const organizationId = await getActiveOrganizationId()
  if (!organizationId)
    return {
      success: false as const,
      error: "No active organization found. Please complete setup at /onboarding first.",
    }

  const supabase = await createClient()

  // Verify the organization exists in app_organizations
  const { data: orgCheck, error: orgError } = await supabase
    .from("app_organizations")
    .select("id")
    .eq("id", organizationId)
    .single()

  if (orgError || !orgCheck) {
    console.error("[v0] Organization verification failed:", {
      organizationId,
      error: orgError,
    })
    return {
      success: false as const,
      error: "Organization not found in database. Please complete onboarding at /onboarding.",
    }
  }

  const { count } = await supabase
    .from("warehouses")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)

  const code = makeGodownCode((count ?? 0) + 1)

  const { data, error } = await supabase
    .from("warehouses")
    .insert({
      organization_id: organizationId,
      name: trimmed,
      code,
      is_default: false,
    })
    .select("id,name,code,is_default")
    .single()

  if (error) {
    console.error("[v0] Error creating godown:", error)
    return { success: false as const, error: error.message }
  }

  revalidatePath("/inventory")
  revalidatePath("/items")

  return {
    success: true as const,
    godown: {
      id: data.id,
      name: data.name,
      code: data.code,
      isDefault: Boolean((data as any).is_default),
    } satisfies Godown,
  }
}
