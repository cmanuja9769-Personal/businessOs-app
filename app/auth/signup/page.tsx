import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { SignupForm } from "@/components/auth/signup-form"
import Link from "next/link"

export const metadata = {
  title: "Sign Up - BusinessOS",
  description: "Create a new BusinessOS account",
}

export default async function SignupPage() {
  // If already logged in, check if they have an organization
  const user = await getCurrentUser()
  if (user) {
    redirect("/onboarding")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30 p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo and Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">📊</span>
            </div>
            <span className="text-2xl font-bold text-foreground">BusinessOS</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Get started</h1>
          <p className="text-muted-foreground">Create your account to begin managing your business</p>
        </div>

        {/* Signup Form */}
        <div className="bg-card rounded-lg shadow-sm border border-border p-8 space-y-6">
          <SignupForm />

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-card text-muted-foreground">Already have an account?</span>
            </div>
          </div>

          {/* Login Link */}
          <Link
            href="/auth/login"
            className="w-full py-2 px-4 rounded-lg border border-border hover:bg-muted text-center font-medium transition-colors"
          >
            Sign in instead
          </Link>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground">
          <p>
            By creating an account, you agree to our{" "}
            <Link href="#" className="hover:text-foreground transition-colors underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="#" className="hover:text-foreground transition-colors underline">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
