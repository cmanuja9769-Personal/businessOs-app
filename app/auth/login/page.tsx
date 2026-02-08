import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { LoginForm } from "@/components/auth/login-form"
import Link from "next/link"

export const metadata = {
  title: "Login - BusinessOS",
  description: "Sign in to your BusinessOS account",
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; redirect?: string }>
}) {
  // If already logged in, redirect to dashboard
  const user = await getCurrentUser()
  if (user) {
    redirect("/")
  }

  const params = await searchParams
  const message = params.message

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
          <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
          <p className="text-muted-foreground">Sign in to your account to continue</p>
        </div>

        {/* Email Confirmation Message */}
        {message === "check-email" && (
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-sm">
            <p className="text-blue-900 dark:text-blue-100 font-medium mb-1">Check your email!</p>
            <p className="text-blue-700 dark:text-blue-300">
              We sent you a confirmation link. Click it to activate your account, then come back to login.
            </p>
          </div>
        )}

        {/* Login Form */}
        <div className="bg-card rounded-lg shadow-sm border border-border p-8 space-y-6">
          <LoginForm />

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-card text-muted-foreground">Don&apos;t have an account?</span>
            </div>
          </div>

          {/* Sign Up Link */}
          <Link
            href="/auth/signup"
            className="w-full py-2 px-4 rounded-lg border border-border hover:bg-muted text-center font-medium transition-colors"
          >
            Create new account
          </Link>
        </div>

        {/* Footer Links */}
        <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
          <Link href="/auth/forgot-password" className="hover:text-foreground transition-colors">
            Forgot password?
          </Link>
          <div className="w-1 h-1 rounded-full bg-border"></div>
          <Link href="/" className="hover:text-foreground transition-colors">
            Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}
