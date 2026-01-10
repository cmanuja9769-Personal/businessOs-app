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

  // Allow creating organizations even if user already has some
  // Multi-org support enabled

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 p-4 sm:p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8 pt-4 sm:pt-8">
          <h1 className="text-2xl sm:text-4xl font-bold tracking-tight mb-2">Create Organization</h1>
          <p className="text-base sm:text-xl text-muted-foreground">Set up a new organization</p>
        </div>

        {/* Onboarding Form */}
        <OnboardingForm />
      </div>
    </div>
  )
}
