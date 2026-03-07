import { createClient, createServiceRoleClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/auth"
import { NextResponse } from "next/server"

function hasInvitePermission(role: string): boolean {
  return role === "owner" || role === "admin"
}

const INVITE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { organizationId, email, role } = await request.json()

    if (!organizationId || !email || !role) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: membership } = await supabase
      .from("app_user_organizations")
      .select("role")
      .eq("user_id", user.id)
      .eq("organization_id", organizationId)
      .single()

    if (!membership || !hasInvitePermission(membership.role)) {
      return NextResponse.json({ error: "You don't have permission to invite users" }, { status: 403 })
    }

    const serviceClient = createServiceRoleClient()

    const { data: existingMembership } = await serviceClient
      .from("app_user_organizations")
      .select("user_id")
      .eq("organization_id", organizationId)
      .eq("user_id", (
        await (async () => {
          const { data: users } = await serviceClient.auth.admin.listUsers()
          return users?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase())?.id
        })()
      ) ?? "00000000-0000-0000-0000-000000000000")
      .maybeSingle()

    if (existingMembership) {
      return NextResponse.json({ error: "User is already a member of this organization" }, { status: 400 })
    }

    const { data: existingInvite } = await serviceClient
      .from("organization_invitations")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("email", email.toLowerCase())
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle()

    if (existingInvite) {
      return NextResponse.json({ error: "An active invitation already exists for this email" }, { status: 400 })
    }

    const inviteToken = crypto.randomUUID()

    const { error: inviteError } = await serviceClient
      .from("organization_invitations")
      .insert({
        organization_id: organizationId,
        email: email.toLowerCase(),
        role: role,
        invited_by: user.id,
        token: inviteToken,
        expires_at: new Date(Date.now() + INVITE_EXPIRY_MS).toISOString(),
      })

    if (inviteError) {
      console.error("Error creating invitation:", inviteError)
      return NextResponse.json({ error: "Failed to create invitation" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Invitation created. User will need to accept the invitation to join.",
      inviteToken,
    })
  } catch (error) {
    console.error("Error in invite endpoint:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
