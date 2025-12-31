import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function getCurrentOrganization(userId: string) {
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

  // Get the first active organization for the user
  const { data, error } = await supabase
    .from("app_user_organizations")
    .select("organization_id, app_organizations(id, name, email, phone, gst_number)")
    .eq("user_id", userId)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle()

  if (error) {
    // Avoid noisy logs for expected "no rows" or RLS recursion (42P17) cases.
    const anyErr = error as any
    const code = anyErr?.code
    const message = anyErr?.message
    const details = anyErr?.details
    const hint = anyErr?.hint

    if (code !== "42P17") {
      console.error("[v0] Error fetching organization:", { code, message, details, hint })
    }
    return null
  }

  console.log("[organizations] getCurrentOrganization data:", JSON.stringify(data, null, 2))

  // Try multiple ways to extract the organization
  if ((data as any)?.app_organizations) {
    console.log("[organizations] Found via nested app_organizations")
    return (data as any).app_organizations
  }
  
  // Fallback: if the nested select failed, use organization_id directly
  if ((data as any)?.organization_id) {
    console.log("[organizations] Found via organization_id, fetching details...")
    const { data: orgData } = await supabase
      .from("app_organizations")
      .select("id, name, email, phone, gst_number")
      .eq("id", (data as any).organization_id)
      .single()
    
    if (orgData) return orgData
  }

  // Fallback: if nothing is marked active (or schema differs), pick any membership.
  const { data: anyData, error: anyError } = await supabase
    .from("app_user_organizations")
    .select("app_organizations(id, name, email, phone, gst_number)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (anyError) {
    const anyErr = anyError as any
    const code = anyErr?.code
    const message = anyErr?.message
    const details = anyErr?.details
    const hint = anyErr?.hint
    if (code !== "42P17") {
      console.error("[v0] Error fetching organization (fallback):", { code, message, details, hint })
    }
    return null
  }

  return (anyData as any)?.app_organizations || null
}

export async function getUserOrganizations(userId: string) {
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

  const { data, error } = await supabase
    .from("app_user_organizations")
    .select("app_organizations(id, name, email, phone)")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[v0] Error fetching organizations:", error)
    return []
  }

  return data?.map((item: any) => item.app_organizations) || []
}

export type CreateOrganizationInput = {
  name: string
  email: string
  phone?: string
  address?: string
  gstNumber?: string
  panNumber?: string
  city?: string
  state?: string
  pincode?: string
  legalName?: string
  tradeName?: string
}

export async function createOrganization(userId: string, input: CreateOrganizationInput) {
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

  // Create organization
  const { data: org, error: orgError } = await supabase
    .from("app_organizations")
    .insert({
      name: input.name,
      email: input.email,
      phone: input.phone || null,
      address: input.address || null,
      gst_number: input.gstNumber || null,
      pan_number: input.panNumber || null,
      owner_id: userId,
      settings: {
        ...(typeof input.legalName === "string" ? { legal_name: input.legalName } : null),
        ...(typeof input.tradeName === "string" ? { trade_name: input.tradeName } : null),
        ...(typeof input.city === "string" ? { city: input.city } : null),
        ...(typeof input.state === "string" ? { state: input.state } : null),
        ...(typeof input.pincode === "string" ? { pincode: input.pincode } : null),
      },
    })
    .select()
    .single()

  if (orgError) {
    console.error("[v0] Error creating organization:", orgError)
    return { success: false, error: orgError.message }
  }

  // Add creator as owner
  const { error: memberError } = await supabase.from("app_user_organizations").insert({
    user_id: userId,
    organization_id: org.id,
    role: "owner",
    is_active: true,
  })

  if (memberError) {
    console.error("[v0] Error adding user to organization:", memberError)
    return { success: false, error: memberError.message }
  }

  // Persist business details in a dedicated table as well.
  // We align `business_details.id` with `organizations.id` so the business record is 1:1 with the tenant.
  const { error: businessError } = await supabase.from("business_details").upsert(
    {
      id: org.id,
      name: input.name,
      legal_name: input.legalName || null,
      trade_name: input.tradeName || null,
      gstin: input.gstNumber || null,
      address: input.address || null,
      city: input.city || null,
      state: input.state || null,
      pincode: input.pincode || null,
      phone: input.phone || null,
      email: input.email || null,
    },
    { onConflict: "id" },
  )

  if (businessError) {
    console.error("[v0] Error saving business details:", {
      code: (businessError as any)?.code,
      message: businessError.message,
      details: (businessError as any)?.details,
      hint: (businessError as any)?.hint,
    })
    return {
      success: false,
      error:
        "Organization was created, but saving business details failed. Ensure the `business_details` table exists and RLS allows inserts for the current user.",
    }
  }

  return { success: true, organization: org }
}
