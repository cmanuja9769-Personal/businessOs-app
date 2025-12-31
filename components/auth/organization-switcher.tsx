"use client"

import { useAuth } from "@/hooks/use-auth"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Building2 } from "lucide-react"

export function OrganizationSwitcher() {
  const { organization, organizations, setOrganization } = useAuth()

  if (!organization || organizations.length === 0) {
    return null
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-muted/50">
      <Building2 className="w-4 h-4 text-muted-foreground" />
      <Select
        value={organization.id}
        onValueChange={(orgId) => {
          const selected = organizations.find((o) => o.id === orgId)
          if (selected) {
            setOrganization(selected)
          }
        }}
      >
        <SelectTrigger className="w-[200px] border-0 bg-transparent">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {organizations.map((org) => (
            <SelectItem key={org.id} value={org.id}>
              {org.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
