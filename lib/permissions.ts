/**
 * Permission checking utilities
 * Defines role-based access control for the application
 */

export type UserRole = "admin" | "salesperson" | "accountant" | "viewer"

export interface Permission {
  create: boolean
  read: boolean
  update: boolean
  delete: boolean
}

export interface Permissions {
  invoices: Permission
  purchases: Permission
  customers: Permission
  items: Permission
  reports: Permission
  settings: Permission
  accounting: Permission
  inventory: Permission
}

// Default permissions for each role
export const DEFAULT_PERMISSIONS: Record<UserRole, Permissions> = {
  admin: {
    invoices: { create: true, read: true, update: true, delete: true },
    purchases: { create: true, read: true, update: true, delete: true },
    customers: { create: true, read: true, update: true, delete: true },
    items: { create: true, read: true, update: true, delete: true },
    reports: { create: true, read: true, update: true, delete: true },
    settings: { read: true, update: true, create: false, delete: false },
    accounting: { create: true, read: true, update: true, delete: true },
    inventory: { create: true, read: true, update: true, delete: true },
  },
  salesperson: {
    invoices: { create: true, read: true, update: true, delete: false },
    purchases: { create: false, read: true, update: false, delete: false },
    customers: { create: true, read: true, update: true, delete: false },
    items: { create: false, read: true, update: false, delete: false },
    reports: { read: true, create: false, update: false, delete: false },
    settings: { read: false, update: false, create: false, delete: false },
    accounting: { read: false, create: false, update: false, delete: false },
    inventory: { read: true, create: false, update: false, delete: false },
  },
  accountant: {
    invoices: { create: false, read: true, update: false, delete: false },
    purchases: { create: false, read: true, update: false, delete: false },
    customers: { create: false, read: true, update: false, delete: false },
    items: { create: false, read: true, update: false, delete: false },
    reports: { create: true, read: true, update: true, delete: false },
    settings: { read: false, update: false, create: false, delete: false },
    accounting: { create: true, read: true, update: true, delete: false },
    inventory: { read: true, create: false, update: false, delete: false },
  },
  viewer: {
    invoices: { create: false, read: true, update: false, delete: false },
    purchases: { create: false, read: true, update: false, delete: false },
    customers: { create: false, read: true, update: false, delete: false },
    items: { create: false, read: true, update: false, delete: false },
    reports: { read: true, create: false, update: false, delete: false },
    settings: { read: false, update: false, create: false, delete: false },
    accounting: { read: true, create: false, update: false, delete: false },
    inventory: { read: true, create: false, update: false, delete: false },
  },
}

/**
 * Check if user has permission for action on resource
 */
export function hasPermission(
  permissions: Permissions,
  resource: keyof Permissions,
  action: "create" | "read" | "update" | "delete",
): boolean {
  const resourcePermissions = permissions[resource]
  return resourcePermissions ? resourcePermissions[action] : false
}

/**
 * Get role description
 */
export function getRoleDescription(role: UserRole): string {
  const descriptions: Record<UserRole, string> = {
    admin: "Full access to all features and settings",
    salesperson: "Can create invoices and manage customers",
    accountant: "Full access to financial reports and accounting",
    viewer: "Read-only access to all data",
  }
  return descriptions[role]
}
