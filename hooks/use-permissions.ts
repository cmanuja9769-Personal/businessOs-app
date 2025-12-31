"use client"

import { useAuth } from "./use-auth"
import { hasPermission } from "@/lib/permissions"
import type { Permissions } from "@/lib/permissions"

export function usePermissions() {
  const { user, userRole } = useAuth()

  if (!user || !userRole) {
    return {
      hasPermission: () => false,
      permissions: null,
    }
  }

  const permissions: Permissions = userRole.permissions as Permissions || {
    invoices: { create: false, read: false, update: false, delete: false },
    purchases: { create: false, read: false, update: false, delete: false },
    customers: { create: false, read: false, update: false, delete: false },
    items: { create: false, read: false, update: false, delete: false },
    reports: { create: false, read: false, update: false, delete: false },
    settings: { create: false, read: false, update: false, delete: false },
    accounting: { create: false, read: false, update: false, delete: false },
    inventory: { create: false, read: false, update: false, delete: false },
  }

  return {
    hasPermission: (resource: keyof Permissions, action: "create" | "read" | "update" | "delete") =>
      hasPermission(permissions, resource, action),
    permissions,
    role: userRole.role,
  }
}
