"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Edit, Loader2 } from "lucide-react"
import { updateUserRole } from "@/app/users/actions"

interface EditUserRoleDialogProps {
  userId: string
  currentRole: string
}

export function EditUserRoleDialog({ userId, currentRole }: EditUserRoleDialogProps) {
  const [open, setOpen] = useState(false)
  const [role, setRole] = useState(currentRole)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleSave = async () => {
    if (role === currentRole) {
      setOpen(false)
      return
    }

    setLoading(true)
    const result = await updateUserRole(userId, role as "admin" | "salesperson" | "accountant" | "viewer")
    setLoading(false)

    if (result.success) {
      toast({
        title: "Success",
        description: "User role updated successfully",
      })
      setOpen(false)
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to update user role",
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Edit className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change User Role</DialogTitle>
          <DialogDescription>Update the role for this user</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">User ID</label>
            <div className="p-2 rounded bg-muted text-sm font-mono">{userId.slice(0, 12)}...</div>
          </div>

          <div className="space-y-2">
            <label htmlFor="role" className="text-sm font-medium">
              Role
            </label>
            <Select value={role} onValueChange={setRole} disabled={loading}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin - Full access</SelectItem>
                <SelectItem value="salesperson">Salesperson - Create invoices</SelectItem>
                <SelectItem value="accountant">Accountant - Financial reports</SelectItem>
                <SelectItem value="viewer">Viewer - Read-only access</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
