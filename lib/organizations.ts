import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

interface Organization {
  readonly id: string
  readonly name: string
  readonly email: string
  readonly phone: string | null
  readonly gst_number: string | null
  readonly pan_number: string | null
  readonly address: string | null
}

interface OrganizationSummary {
  readonly id: string
  readonly name: string
  readonly email: string
  readonly phone: string | null
}

interface SupabaseError {
  readonly code?: string
  readonly message: string
  readonly details?: string
  readonly hint?: string
}

interface UserOrgRow {
  readonly organization_id: string
  readonly app_organizations: Organization | null
}

interface UserOrgSummaryRow {
  readonly app_organizations: OrganizationSummary | null
}

async function createSupabaseClient() {
  return createServerClient(
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
}

function isRlsRecursionError(error: SupabaseError): boolean {
  return error.code === "42P17"
}

function logSupabaseError(label: string, error: SupabaseError): void {
  if (!isRlsRecursionError(error)) {
    console.error(label, {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    })
  }
}

export async function getCurrentOrganization(userId: string): Promise<Organization | null> {
  const supabase = await createSupabaseClient()

  const { data, error } = await supabase
    .from("app_user_organizations")
    .select("organization_id, app_organizations(id, name, email, phone, gst_number, pan_number, address)")
    .eq("user_id", userId)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle()

  if (error) {
    logSupabaseError("[v0] Error fetching organization:", error as SupabaseError)
    return null
  }

  const row = data as unknown as UserOrgRow | null
  if (row?.app_organizations) {
    return row.app_organizations
  }

  if (row?.organization_id) {
    const { data: orgData } = await supabase
      .from("app_organizations")
      .select("id, name, email, phone, gst_number, pan_number, address")
      .eq("id", row.organization_id)
      .single()

    if (orgData) return orgData as Organization
  }

  const { data: fallbackData, error: fallbackError } = await supabase
    .from("app_user_organizations")
    .select("app_organizations(id, name, email, phone, gst_number, pan_number, address)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (fallbackError) {
    logSupabaseError("[v0] Error fetching organization (fallback):", fallbackError as SupabaseError)
    return null
  }

  const fallbackRow = fallbackData as unknown as UserOrgSummaryRow | null
  return (fallbackRow?.app_organizations as unknown as Organization) ?? null
}

export async function getUserOrganizations(userId: string): Promise<OrganizationSummary[]> {
  const supabase = await createSupabaseClient()

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

  const rows = (data ?? []) as unknown as UserOrgSummaryRow[]
  return rows
    .map((item) => item.app_organizations)
    .filter((org): org is OrganizationSummary => org !== null)
}

export type CreateOrganizationInput = Readonly<{
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
}>

type CreateOrgResult =
  | { readonly success: true; readonly organization: Organization }
  | { readonly success: false; readonly error: string }

export async function createOrganization(userId: string, input: CreateOrganizationInput): Promise<CreateOrgResult> {
  const supabase = await createSupabaseClient()

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
    const sbErr = businessError as SupabaseError
    console.error("[v0] Error saving business details:", {
      code: sbErr.code,
      message: sbErr.message,
      details: sbErr.details,
      hint: sbErr.hint,
    })
    return {
      success: false,
      error:
        "Organization was created, but saving business details failed. Ensure the `business_details` table exists and RLS allows inserts for the current user.",
    }
  }

  return { success: true, organization: org as unknown as Organization }
}
