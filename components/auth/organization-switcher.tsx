"use client"

import { useAuth } from "@/hooks/use-auth"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Building2 } from "lucide-react"
import { useSyncExternalStore } from "react"

const subscribe = () => () => {}

export function OrganizationSwitcher() {
  const { organization, organizations, setOrganization, loading } = useAuth()
  const mounted = useSyncExternalStore(subscribe, () => true, () => false)

  if (!mounted) {
    return null
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border bg-card">
        <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <span className="text-sm text-muted-foreground">Loading…</span>
      </div>
    )
  }

  if (!organization || organizations.length === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border bg-card">
        <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <span className="text-sm text-muted-foreground">No organizations</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 px-2 py-1 rounded-md border bg-card">
      <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      <Select
        value={organization.id}
        onValueChange={(orgId) => {
          const selected = organizations.find((o) => o.id === orgId)
          if (selected) {
            setOrganization(selected)
          }
        }}
      >
        <SelectTrigger className="h-8 w-[120px] sm:w-[160px] border-0 bg-transparent px-1 sm:px-2 text-xs sm:text-sm focus:ring-0">
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
