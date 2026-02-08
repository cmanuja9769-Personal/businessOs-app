import { ForgotPasswordForm } from "@/components/auth/forgot-password-form"
import Link from "next/link"

export const metadata = {
  title: "Forgot Password - BusinessOS",
  description: "Reset your BusinessOS password",
}

export default function ForgotPasswordPage() {
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
          <h1 className="text-3xl font-bold tracking-tight">Reset password</h1>
          <p className="text-muted-foreground">Enter your email and we&apos;ll send you a link to reset your password</p>
        </div>

        {/* Form Card */}
        <div className="bg-card rounded-lg shadow-sm border border-border p-8">
          <ForgotPasswordForm />
        </div>

        {/* Back to Login Link */}
        <div className="text-center">
          <Link href="/auth/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  )
}
