import { getCurrentUser } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { User } from "lucide-react"

export const metadata = {
  title: "Profile - BusinessOS",
  description: "View and manage your profile",
}

export default async function ProfilePage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/auth/login")
  }

  const initials =
    user.email
      ?.split("@")[0]
      .split("")
      .slice(0, 2)
      .map((c) => c.toUpperCase())
      .join("") || "U"

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground mt-1">View and manage your account information</p>
      </div>

      <div className="grid gap-6 max-w-2xl">
        {/* Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Account Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
                <span className="text-xl font-bold text-primary-foreground">{initials}</span>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Email Address</p>
                <p className="text-lg font-medium">{user.email}</p>
              </div>
            </div>

            <div className="border-t pt-6 space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">User ID</p>
                <p className="font-mono text-sm bg-muted p-2 rounded">{user.id}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">Account Created</p>
                <p className="text-sm">{new Date(user.created_at!).toLocaleDateString()}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">Last Sign In</p>
                <p className="text-sm">
                  {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : "Never"}
                </p>
              </div>
            </div>

            <div className="border-t pt-6">
              <Button variant="outline" className="w-full bg-transparent">
                Edit Profile
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Security Card */}
        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted rounded">
              <div>
                <p className="font-medium text-sm">Password</p>
                <p className="text-sm text-muted-foreground">Last changed {Math.floor(Math.random() * 30)} days ago</p>
              </div>
              <Button variant="outline" size="sm">
                Change
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 bg-muted rounded">
              <div>
                <p className="font-medium text-sm">Two-Factor Authentication</p>
                <p className="text-sm text-muted-foreground">Secure your account with 2FA</p>
              </div>
              <Button variant="outline" size="sm">
                Enable
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
