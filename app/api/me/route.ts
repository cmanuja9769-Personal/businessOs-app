import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { isDemoMode, DEMO_USER_ID, DEMO_ORG_ID, DEMO_ORG_NAME } from "@/app/demo/helpers"

export async function GET() {
  if (await isDemoMode()) {
    return NextResponse.json({
      user: {
        id: DEMO_USER_ID,
        email: "demo@businessos.app",
        app_metadata: {},
        user_metadata: { full_name: "Demo User" },
        aud: "authenticated",
        created_at: new Date().toISOString(),
      },
      userRole: { role: "admin", permissions: {} },
      organizations: [{ id: DEMO_ORG_ID, name: DEMO_ORG_NAME, email: "info@techmart.in", phone: "080-26541234" }],
    }, { status: 200 })
  }

  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ user: null, userRole: null, organizations: [] }, { status: 200 })
  }

  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role, permissions")
    .eq("user_id", user.id)
    .maybeSingle()

  const { data: orgData } = await supabase
    .from("app_user_organizations")
    .select("app_organizations(id, name, email, phone)")
    .eq("user_id", user.id)

  const organizations =
    orgData
      ?.map((row: Record<string, unknown>) => row.app_organizations as { id: string; name: string; email: string; phone: string } | null)
      .filter(Boolean) ?? []

  return NextResponse.json({ user, userRole: roleData ?? null, organizations }, { status: 200 })
}