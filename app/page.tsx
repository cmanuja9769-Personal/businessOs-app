import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

export default async function HomePage() {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect("/auth/login")
  }
  
  const supabase = await createClient()

  const { data: orgMembership } = await supabase
    .from("app_user_organizations")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle()

  if (!orgMembership) {
    const { data: pendingInvite } = await supabase
      .from("organization_invitations")
      .select("id")
      .eq("email", user.email!)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .limit(1)
      .maybeSingle()

    if (pendingInvite) {
      redirect("/auth/accept-invite")
    }

    redirect("/onboarding")
  }

  redirect("/dashboard")
}
