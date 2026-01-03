import { getCurrentUser } from "@/lib/auth"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Building2, Users, Mail, Phone, MapPin, UserPlus } from "lucide-react"
import Link from "next/link"

export default async function OrganizationSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()

  if (!user) {
    redirect("/auth/login")
  }

  const supabase = await createClient()

  // Check if user has access to this organization
  const { data: membership } = await supabase
    .from("app_user_organizations")
    .select("role")
    .eq("user_id", user.id)
    .eq("organization_id", id)
    .single()

  if (!membership) {
    redirect("/unauthorized")
  }

  // Fetch organization details
  const { data: org } = await supabase.from("app_organizations").select("*").eq("id", id).single()

  // Fetch all members
  const { data: members } = await supabase
    .from("app_user_organizations")
    .select(
      `
      id,
      role,
      is_active,
      created_at,
      user_id
    `,
    )
    .eq("organization_id", id)
    .order("created_at", { ascending: true })

  // Fetch user emails from auth (if accessible)
  const membersWithEmails = await Promise.all(
    (members || []).map(async (m) => {
      // Try to get user email from a lookup or keep user_id
      return {
        ...m,
        email: m.user_id === user.id ? user.email : null, // Only show current user's email
        isCurrentUser: m.user_id === user.id,
      }
    }),
  )

  if (!org) {
    redirect("/organizations")
  }

  const canInvite = membership.role === "owner" || membership.role === "admin"

  return (
    <div className="container p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/organizations" className="text-sm text-muted-foreground hover:text-foreground mb-2 block">
            ← Back to Organizations
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">{org.name}</h1>
          <p className="text-muted-foreground mt-1">Organization settings and members</p>
        </div>
        <Badge variant={membership.role === "owner" ? "default" : "secondary"}>{membership.role}</Badge>
      </div>

      <Tabs defaultValue="details" className="space-y-6">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="members">Members ({members?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Organization Information</CardTitle>
              <CardDescription>Basic details about your organization</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Legal Name</p>
                  <p className="font-medium">{org.legal_name || org.name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Trade Name</p>
                  <p className="font-medium">{org.trade_name || "-"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    {org.email}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    {org.phone || "-"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">GSTIN</p>
                  <p className="font-medium font-mono">{org.gst_number || "-"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">PAN</p>
                  <p className="font-medium font-mono">{org.pan_number || "-"}</p>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p className="font-medium flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <span>
                      {org.address}
                      <br />
                      {org.city}, {org.state} {org.pincode}
                    </span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Organization Members</CardTitle>
                  <CardDescription>People who have access to this organization</CardDescription>
                </div>
                {canInvite && (
                  <Button asChild size="sm">
                    <Link href={`/organizations/${id}/invite`}>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Invite User
                    </Link>
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {membersWithEmails.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {member.email ? member.email.substring(0, 2).toUpperCase() : "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{member.email || `User ${member.user_id.slice(0, 8)}`}</p>
                        <p className="text-sm text-muted-foreground">
                          Joined {new Date(member.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={member.role === "owner" ? "default" : "secondary"}>{member.role}</Badge>
                      {member.isCurrentUser && <Badge variant="outline">You</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
