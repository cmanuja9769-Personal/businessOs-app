import { getCurrentUser, getUserRole } from "@/lib/auth"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PageHeader } from "@/components/ui/page-header"
import { DataEmptyState } from "@/components/ui/data-empty-state"
import { RoleBadge, type UserRole } from "@/components/ui/role-badge"
import { Users } from "lucide-react"
import { EditUserRoleDialog } from "@/components/users/edit-user-role-dialog"

interface UserRecord {
  user_id: string
  role: string
  created_at: string
}

export const metadata = {
  title: "Users - BusinessOS",
  description: "Manage application users and permissions",
}

export default async function UsersPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/auth/login")
  }

  const userRole = await getUserRole(user.id)
  if (!userRole || userRole.role !== "admin") {
    redirect("/unauthorized")
  }

  const supabase = await createClient()

  const { data: users, error } = await supabase
    .from("user_roles")
    .select("user_id, role, created_at")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[v0] Error fetching users:", error)
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">Error loading users</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 h-[calc(100vh-64px)] flex flex-col overflow-hidden">
      <PageHeader
        title="Users"
        description="Manage user access and permissions"
      />

      <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <CardHeader className="pb-3 shrink-0">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Users className="w-5 h-5" />
            <span className="hidden sm:inline">User Accounts</span>
            <span className="sm:hidden">Users</span>
            <span className="text-muted-foreground">({users?.length || 0})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 overflow-hidden p-0 sm:px-6 sm:pb-6">
          {!users || users.length === 0 ? (
            <DataEmptyState
              icon={<Users className="w-12 h-12" />}
              title="No users yet"
              description="Users will appear here once they sign up"
            />
          ) : (
            <Table containerClassName="flex-1 min-h-0 max-h-full">
              <TableHeader>
                <TableRow>
                  <TableHead resizable className="w-[200px] min-w-[150px]">User ID</TableHead>
                  <TableHead resizable>Role</TableHead>
                  <TableHead resizable>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u: UserRecord) => (
                  <TableRow key={u.user_id}>
                    <TableCell className="font-mono text-sm">{u.user_id.slice(0, 8)}...</TableCell>
                    <TableCell>
                      <RoleBadge role={u.role as UserRole} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <EditUserRoleDialog userId={u.user_id} currentRole={u.role} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
