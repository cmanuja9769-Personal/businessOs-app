import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"
import Link from "next/link"

export const metadata = {
  title: "Unauthorized - BusinessOS",
  description: "You don't have access to this page",
}

export default function UnauthorizedPage() {
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
