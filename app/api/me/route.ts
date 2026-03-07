import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { isDemoMode, DEMO_USER_ID, DEMO_ORG_ID, DEMO_ORG_NAME } from "@/app/demo/helpers"

interface OrgRow {
  readonly app_organizations: {
    readonly id: string
    readonly name: string
    readonly email: string
    readonly phone: string
  } | null
}

interface PendingInvitation {
  readonly id: string
  readonly organization_id: string
  readonly role: string
  readonly token: string
  readonly expires_at: string
  readonly org_name: string | null
}

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
      pendingInvitations: [],
    }, { status: 200 })
  }

  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ user: null, userRole: null, organizations: [], pendingInvitations: [] }, { status: 200 })
  }

  const [roleResult, orgResult, inviteResult] = await Promise.all([
    supabase
      .from("user_roles")
      .select("role, permissions")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("app_user_organizations")
      .select("app_organizations(id, name, email, phone)")
      .eq("user_id", user.id)
      .eq("is_active", true),
    supabase
      .from("organization_invitations")
      .select("id, organization_id, role, token, expires_at, app_organizations(name)")
      .eq("email", user.email!)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString()),
  ])

  const organizations =
    orgResult.data
      ?.map((row: unknown) => (row as OrgRow).app_organizations)
      .filter(Boolean) ?? []

  const pendingInvitations: PendingInvitation[] =
    inviteResult.data?.map((inv: Record<string, unknown>) => ({
      id: inv.id as string,
      organization_id: inv.organization_id as string,
      role: inv.role as string,
      token: inv.token as string,
      expires_at: inv.expires_at as string,
      org_name: (inv.app_organizations as { name: string } | null)?.name ?? null,
    })) ?? []

  return NextResponse.json({
    user,
    userRole: roleResult.data ?? null,
    organizations,
    pendingInvitations,
  }, { status: 200 })
}