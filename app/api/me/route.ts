import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
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
    orgData?.filter((row: any) => row.app_organizations).map((row: any) => row.app_organizations) || []

  return NextResponse.json({ user, userRole: roleData ?? null, organizations }, { status: 200 })
}