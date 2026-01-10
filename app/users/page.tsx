import { getCurrentUser, getUserRole } from "@/lib/auth"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Users } from "lucide-react"
import { EditUserRoleDialog } from "@/components/users/edit-user-role-dialog"

export const metadata = {
  title: "Users - BusinessOS",
  description: "Manage application users and permissions",
}

export default async function UsersPage() {
  const user = await getCurrentUser()

  // Redirect if not authenticated
  if (!user) {
    redirect("/auth/login")
  }

  // Check if user is admin
  const userRole = await getUserRole(user.id)
  if (!userRole || userRole.role !== "admin") {
    redirect("/unauthorized")
  }

  const supabase = await createClient()

  // Fetch all users with their roles
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

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-500/10 text-red-700 dark:text-red-400"
      case "salesperson":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400"
      case "accountant":
        return "bg-green-500/10 text-green-700 dark:text-green-400"
      case "viewer":
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400"
      default:
        return "bg-muted"
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">Manage user access and permissions</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Users className="w-5 h-5" />
            <span className="hidden sm:inline">User Accounts</span>
            <span className="sm:hidden">Users</span>
            <span className="text-muted-foreground">({users?.length || 0})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!users || users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No users yet</h3>
              <p className="text-muted-foreground">Users will appear here once they sign up</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User ID</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u: any) => (
                  <TableRow key={u.user_id}>
                    <TableCell className="font-mono text-sm">{u.user_id.slice(0, 8)}...</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={getRoleColor(u.role)}>
                        {u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                      </Badge>
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
