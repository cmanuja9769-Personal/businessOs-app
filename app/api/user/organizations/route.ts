import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = await createClient()
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: orgData, error: orgError } = await supabase
    .from("app_user_organizations")
    .select("app_organizations(id, name, email, phone)")
    .eq("user_id", user.id)

  if (orgError) {
    console.error("[API] Error fetching organizations:", orgError)
    return NextResponse.json({ error: orgError.message }, { status: 500 })
  }

  const organizations = orgData
    ?.filter((item: { app_organizations: { id: string; name: string; email: string; phone: string }[] }) => item.app_organizations.length > 0)
    .map((item: { app_organizations: { id: string; name: string; email: string; phone: string }[] }) => item.app_organizations[0]) || []

  return NextResponse.json({ organizations })
}
