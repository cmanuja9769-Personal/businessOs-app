import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"

export const metadata = {
  title: "Create Organization - BusinessOS",
  description: "Create a new organization",
}

export default async function CreateOrganizationPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Redirect to onboarding page (which now supports multiple orgs)
  redirect("/onboarding")
}
