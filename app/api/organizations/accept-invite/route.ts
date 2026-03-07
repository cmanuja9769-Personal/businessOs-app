import { NextResponse } from "next/server"
import { createClient, createServiceRoleClient } from "@/lib/supabase/server"

interface InvitationRecord {
  readonly id: string
  readonly organization_id: string
  readonly email: string
  readonly role: string
  readonly expires_at: string
  readonly accepted_at: string | null
}

function validateInvitation(
  invitation: InvitationRecord,
  userEmail: string,
): string | null {
  if (invitation.email.toLowerCase() !== userEmail.toLowerCase()) {
    return "This invitation is for a different email address"
  }
  if (invitation.accepted_at) {
    return "Invitation already used"
  }
  if (new Date(invitation.expires_at) < new Date()) {
    return "Invitation has expired"
  }
  return null
}

async function acceptInvitation(
  serviceClient: ReturnType<typeof createServiceRoleClient>,
  userId: string,
  invitation: InvitationRecord,
) {
  const { data: existingMembership } = await serviceClient
    .from("app_user_organizations")
    .select("user_id")
    .eq("user_id", userId)
    .eq("organization_id", invitation.organization_id)
    .maybeSingle()

  if (!existingMembership) {
    const { error: memberError } = await serviceClient
      .from("app_user_organizations")
      .insert({
        user_id: userId,
        organization_id: invitation.organization_id,
        role: invitation.role,
        is_active: true,
      })

    if (memberError) {
      console.error("Error adding user to organization:", memberError)
      return NextResponse.json({ error: "Failed to join organization" }, { status: 500 })
    }

    const roleMapping: Record<string, string> = {
      owner: "admin",
      admin: "admin",
      member: "viewer",
    }
    await serviceClient
      .from("user_roles")
      .upsert(
        {
          user_id: userId,
          role: roleMapping[invitation.role] || "viewer",
          organization_id: invitation.organization_id,
          permissions: {},
        },
        { onConflict: "user_id,organization_id", ignoreDuplicates: true },
      )
  }

  await serviceClient
    .from("organization_invitations")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", invitation.id)

  return NextResponse.json({
    success: true,
    action: "accepted",
    organizationId: invitation.organization_id,
  })
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { invitationId, action } = await request.json()

    if (!invitationId || !action || (action !== "accept" && action !== "decline")) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    const serviceClient = createServiceRoleClient()

    const { data: invitation, error: invError } = await serviceClient
      .from("organization_invitations")
      .select("id, organization_id, email, role, expires_at, accepted_at")
      .eq("id", invitationId)
      .single()

    if (invError || !invitation) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 })
    }

    const validationError = validateInvitation(invitation as InvitationRecord, user.email!)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    if (action === "decline") {
      await serviceClient
        .from("organization_invitations")
        .delete()
        .eq("id", invitationId)

      return NextResponse.json({ success: true, action: "declined" })
    }

    return acceptInvitation(serviceClient, user.id, invitation as InvitationRecord)
  } catch (error) {
    console.error("Error in accept-invite endpoint:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
