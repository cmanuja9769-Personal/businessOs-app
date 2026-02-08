import { cva, type VariantProps } from "class-variance-authority"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export type UserRole = "admin" | "salesperson" | "accountant" | "viewer" | "owner" | "member"

const roleBadgeVariants = cva("text-xs font-medium", {
  variants: {
    role: {
      admin: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      salesperson: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      accountant: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      viewer: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
      owner: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
      member: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400",
    },
  },
  defaultVariants: {
    role: "viewer",
  },
})

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  salesperson: "Salesperson",
  accountant: "Accountant",
  viewer: "Viewer",
  owner: "Owner",
  member: "Member",
}

interface RoleBadgeProps extends VariantProps<typeof roleBadgeVariants> {
  role: UserRole
  className?: string
}

export function RoleBadge({ role, className }: RoleBadgeProps) {
  const displayRole = ROLE_LABELS[role] || role.charAt(0).toUpperCase() + role.slice(1)
  
  return (
    <Badge
      variant="secondary"
      className={cn(roleBadgeVariants({ role }), className)}
    >
      {displayRole}
    </Badge>
  )
}
