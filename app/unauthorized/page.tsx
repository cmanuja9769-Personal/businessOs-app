import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"
import Link from "next/link"
import { getCurrentUser, getUserRole } from "@/lib/auth"

export const metadata = {
  title: "Unauthorized - BusinessOS",
  description: "You don't have access to this page",
}

export default async function UnauthorizedPage() {
  // Get current user info for debugging
  const user = await getCurrentUser()
  const userRole = user ? await getUserRole(user.id) : null

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30 p-4">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Access Denied</h1>
          <p className="text-muted-foreground">
            You don't have permission to access this page. Please contact your administrator if you believe this is a
            mistake.
          </p>

          {/* Show current role for debugging */}
          {user && userRole && (
            <div className="mt-4 p-3 bg-muted rounded-lg text-sm">
              <p className="text-muted-foreground">
                Your current role: <span className="font-semibold text-foreground">{userRole.role}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">User ID: {user.id.slice(0, 8)}...</p>
            </div>
          )}
        </div>

        <div className="flex gap-3 justify-center">
          <Link href="/">
            <Button>Back to Dashboard</Button>
          </Link>
          <Link href="/settings">
            <Button variant="outline">Account Settings</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
