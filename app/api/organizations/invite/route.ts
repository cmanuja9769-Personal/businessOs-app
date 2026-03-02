import { createClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/auth"
import { NextResponse } from "next/server"
import { SupabaseClient } from "@supabase/supabase-js"

function hasInvitePermission(role: string): boolean {
  return role === "owner" || role === "admin"
}

async function addExistingUserToOrg(
  supabase: SupabaseClient,
  userId: string,
  organizationId: string,
  role: string,
) {
  const { data: existingMembership } = await supabase
    .from("app_user_organizations")
    .select("id")
    .eq("user_id", userId)
    .eq("organization_id", organizationId)
    .single()

  if (existingMembership) {
    return NextResponse.json({ error: "User is already a member of this organization" }, { status: 400 })
  }

  const { error: addError } = await supabase.from("app_user_organizations").insert({
    user_id: userId,
    organization_id: organizationId,
    role: role,
    is_active: true,
  })

  if (addError) {
    console.error("Error adding user to organization:", addError)
    return NextResponse.json({ error: "Failed to add user to organization" }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    message: "User added to organization",
  })
}

const INVITE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000

async function createInvitation(
  supabase: SupabaseClient,
  organizationId: string,
  email: string,
  role: string,
  invitedBy: string,
) {
  const inviteToken = crypto.randomUUID()

  const { error: inviteError } = await supabase.from("organization_invitations").insert({
    organization_id: organizationId,
    email: email.toLowerCase(),
    role: role,
    invited_by: invitedBy,
    token: inviteToken,
    expires_at: new Date(Date.now() + INVITE_EXPIRY_MS).toISOString(),
  })

  if (inviteError) {
    console.error("Error creating invitation:", inviteError)
    return NextResponse.json(
      {
        error: "Invitation feature requires database setup. User will need to sign up and request access.",
      },
      { status: 500 },
    )
  }

  return NextResponse.json({
    success: true,
    message: "Invitation created. User will receive an email.",
    inviteToken,
  })
}

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

    const { data: invitedUser } = await supabase.auth.admin.listUsers()
    const existingUser = invitedUser?.users?.find((u) => u.email === email)

    if (existingUser) {
      return addExistingUserToOrg(supabase, existingUser.id, organizationId, role)
    }

    return createInvitation(supabase, organizationId, email, role, user.id)
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
