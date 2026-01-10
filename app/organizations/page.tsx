import { getCurrentUser, getUserRole } from "@/lib/auth"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Building2, Users, Settings, UserPlus } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"

export const metadata = {
  title: "Organizations - BusinessOS",
  description: "Manage your organizations",
}

// Force dynamic rendering to ensure fresh data on every request
export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function OrganizationsPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/auth/login")
  }0

  const supabase = await createClient()

  // Fetch all organizations user belongs to
  const { data: userOrgs, error } = await supabase
    .from("app_user_organizations")
    .select(
      `
      id,
      role,
      is_active,
      created_at,
      app_organizations (
        id,
        name,
        email,
        phone,
        address,
        gst_number,
        pan_number,
        owner_id
      )
    `,
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  const organizations = userOrgs
    ?.filter((uo: any) => uo.app_organizations) // Filter out null organizations
    .map((uo: any) => ({
      ...uo.app_organizations,
      userRole: uo.role,
      isActive: uo.is_active,
      membershipId: uo.id,
    })) || []

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Organizations</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">Manage your organizations and memberships</p>
        </div>
        <Link href="/organizations/new">
          <Button className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            New Organization
          </Button>
        </Link>
      </div>

      {/* Organizations Grid */}
      {organizations && organizations.length > 0 ? (
        <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {organizations.map((org: any) => (
            <Card key={org.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{org.name}</CardTitle>
                      <Badge variant={org.userRole === "owner" ? "default" : "secondary"} className="mt-1">
                        {org.userRole}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm space-y-1">
                  <p className="text-muted-foreground">{org.email}</p>
                  {org.phone && <p className="text-muted-foreground">{org.phone}</p>}
                  {org.address && (
                    <p className="text-muted-foreground text-xs">{org.address}</p>
                  )}
                  {org.gst_number && (
                    <p className="text-xs text-muted-foreground font-mono">GST: {org.gst_number}</p>
                  )}
                </div>

                <div className="flex gap-2">
                  {(org.userRole === "owner" || org.userRole === "admin") && (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/organizations/${org.id}/invite`}>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Invite
                      </Link>
                    </Button>
                  )}
                  <Link href={`/organizations/${org.id}/settings`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      <Settings className="w-4 h-4 mr-2" />
                      Settings
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No organizations yet</h3>
            <p className="text-muted-foreground mb-4">Create your first organization to get started</p>
            <Link href="/organizations/new">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Organization
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
