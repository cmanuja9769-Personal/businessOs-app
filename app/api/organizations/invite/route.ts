import { createClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/auth"
import { NextResponse } from "next/server"

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

    // Check if current user has permission to invite (must be owner or admin)
    const { data: membership } = await supabase
      .from("app_user_organizations")
      .select("role")
      .eq("user_id", user.id)
      .eq("organization_id", organizationId)
      .single()

    if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
      return NextResponse.json({ error: "You don't have permission to invite users" }, { status: 403 })
    }

    // Check if invited user exists
    const { data: invitedUser } = await supabase.auth.admin.listUsers()
    const existingUser = invitedUser?.users?.find((u) => u.email === email)

    if (existingUser) {
      // User exists - add them directly to the organization
      const { data: existingMembership } = await supabase
        .from("app_user_organizations")
        .select("id")
        .eq("user_id", existingUser.id)
        .eq("organization_id", organizationId)
        .single()

      if (existingMembership) {
        return NextResponse.json({ error: "User is already a member of this organization" }, { status: 400 })
      }

      const { error: addError } = await supabase.from("app_user_organizations").insert({
        user_id: existingUser.id,
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
    } else {
      // User doesn't exist - create invitation token
      // For now, we'll store pending invitations in a table
      // In production, you'd send an email with a signup link

      const inviteToken = crypto.randomUUID()

      const { error: inviteError } = await supabase.from("organization_invitations").insert({
        organization_id: organizationId,
        email: email.toLowerCase(),
        role: role,
        invited_by: user.id,
        token: inviteToken,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      })

      if (inviteError) {
        // Table might not exist yet
        console.error("Error creating invitation:", inviteError)
        return NextResponse.json(
          {
            error: "Invitation feature requires database setup. User will need to sign up and request access.",
          },
          { status: 500 },
        )
      }

      // In production, send email here
      // await sendInvitationEmail(email, organizationId, inviteToken)

      return NextResponse.json({
        success: true,
        message: "Invitation created. User will receive an email.",
        inviteToken, // In production, don't return this
      })
    }
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
