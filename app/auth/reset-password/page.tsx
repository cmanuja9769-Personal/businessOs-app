import { ResetPasswordForm } from "@/components/auth/reset-password-form"
import Link from "next/link"

export const metadata = {
  title: "Reset Password - BusinessOS",
  description: "Create a new password for your BusinessOS account",
}

export default function ResetPasswordPage() {
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
          <h1 className="text-3xl font-bold tracking-tight">Create new password</h1>
          <p className="text-muted-foreground">Enter a new password for your account</p>
        </div>

        {/* Form Card */}
        <div className="bg-card rounded-lg shadow-sm border border-border p-8">
          <ResetPasswordForm />
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
