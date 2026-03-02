"use client"

import type React from "react"

import { createContext, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"

export interface UserRole {
  role: "admin" | "salesperson" | "accountant" | "viewer" | "user"
  permissions: Record<string, boolean>
}

export interface Organization {
  id: string
  name: string
  email?: string
  phone?: string
}

interface AuthContextType {
  user: User | null
  userRole: UserRole | null
  organization: Organization | null
  organizations: Organization[]
  loading: boolean
  setOrganization: (org: Organization | null) => void
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

function resolveActiveOrganization(orgs: Organization[]): Organization | null {
  if (orgs.length === 0) return null

  try {
    const savedId = localStorage.getItem("activeOrganizationId")
    const saved = savedId ? orgs.find((o) => o.id === savedId) : null
    if (saved) return saved
  } catch {
  }

  return orgs[0]
}

function parseApiResponse(json: Record<string, unknown>) {
  const user = (json.user ?? null) as User | null
  const userRole = (json.userRole ?? null) as UserRole | null
  const organizations: Organization[] = Array.isArray(json.organizations) ? json.organizations : []
  return { user, userRole, organizations }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const [organization, setOrganizationState] = useState<Organization | null>(null)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)

  const setOrganization = (org: Organization | null) => {
    setOrganizationState(org)
    try {
      if (org) {
        localStorage.setItem("activeOrganizationId", org.id)
      } else {
        localStorage.removeItem("activeOrganizationId")
      }
    } catch {
    }
  }

  useEffect(() => {
    let isMounted = true

    const hydrateFromServer = async () => {
      try {
        const res = await fetch("/api/me", { credentials: "include" })
        const json = await res.json()
        if (!isMounted) return

        const parsed = parseApiResponse(json)
        setUser(parsed.user)
        setUserRole(parsed.userRole)
        setOrganizations(parsed.organizations)

        const activeOrg = resolveActiveOrganization(parsed.organizations)
        if (activeOrg) {
          setOrganization(activeOrg)
        } else {
          setOrganization(null)
        }
      } catch {
        if (!isMounted) return
        setUser(null)
        setUserRole(null)
        setOrganization(null)
        setOrganizations([])
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    hydrateFromServer()

    const supabase = createClient()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async () => {
      await hydrateFromServer()
    })

    return () => {
      isMounted = false
      subscription?.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" })
    } catch {
    }

    setUser(null)
    setUserRole(null)
    setOrganization(null)
    setOrganizations([])
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        userRole,
        organization,
        organizations,
        loading,
        setOrganization: setOrganization,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
