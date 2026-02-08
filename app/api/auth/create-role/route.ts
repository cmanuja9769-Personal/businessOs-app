import { createClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/auth"
import { NextResponse } from "next/server"

export async function POST(_request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createClient()

    // Check if user already has a role
    const { data: existingRole } = await supabase
      .from("user_roles")
      .select("id, role")
      .eq("user_id", user.id)
      .single()

    if (existingRole) {
      return NextResponse.json({
        message: "User already has a role",
        role: existingRole.role,
      })
    }

    // Check if this is the first user (make them admin)
    const { data: allRoles } = await supabase.from("user_roles").select("id").limit(1)

    const isFirstUser = !allRoles || allRoles.length === 0
    const defaultRole = isFirstUser ? "admin" : "user"

    // Create the role
    const { data: newRole, error: roleError } = await supabase
      .from("user_roles")
      .insert({
        user_id: user.id,
        role: defaultRole,
        permissions: {},
      })
      .select()
      .single()

    if (roleError) {
      console.error("Error creating user role:", roleError)
      return NextResponse.json(
        {
          error: "Failed to create user role",
          details: roleError.message,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      message: "User role created successfully",
      role: defaultRole,
      data: newRole,
    })
  } catch (error) {
    console.error("Error in create-role endpoint:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function GET(_request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createClient()

    // Check user's role
    const { data: userRole, error } = await supabase
      .from("user_roles")
      .select("role, permissions, created_at")
      .eq("user_id", user.id)
      .single()

    if (error) {
      return NextResponse.json({
        hasRole: false,
        error: error.message,
        userId: user.id,
      })
    }

    return NextResponse.json({
      hasRole: true,
      role: userRole.role,
      permissions: userRole.permissions,
      createdAt: userRole.created_at,
      userId: user.id,
    })
  } catch (error) {
    console.error("Error checking user role:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
