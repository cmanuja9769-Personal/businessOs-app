import { getCurrentUser } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { OnboardingForm } from "@/components/onboarding/onboarding-form"

export const metadata = {
  title: "Get Started - BusinessOS",
  description: "Complete your BusinessOS setup",
}

export default async function OnboardingPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/auth/login")
  }

  const supabase = await createClient()

  // Check if user already has an organization
  const { data: userOrgs } = await supabase.from("app_user_organizations").select("id").eq("user_id", user.id).limit(1)

  if (userOrgs && userOrgs.length > 0) {
    redirect("/")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 pt-8">
          <h1 className="text-4xl font-bold tracking-tight mb-2">Welcome to BusinessOS</h1>
          <p className="text-xl text-muted-foreground">Let's set up your first organization</p>
        </div>

        {/* Onboarding Form */}
        <OnboardingForm />
      </div>
    </div>
  )
}
