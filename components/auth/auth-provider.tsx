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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const [organization, setOrganizationState] = useState<Organization | null>(null)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)

  // Wrapper to persist active organization in localStorage
  const setOrganization = (org: Organization | null) => {
    setOrganizationState(org)
    try {
      if (org) {
        localStorage.setItem("activeOrganizationId", org.id)
      } else {
        localStorage.removeItem("activeOrganizationId")
      }
    } catch {
      // ignore localStorage errors
    }
  }

  useEffect(() => {
    let isMounted = true

    const hydrateFromServer = async () => {
      try {
        const res = await fetch("/api/me", { credentials: "include" })
        const json = await res.json()
        if (!isMounted) return

        setUser((json.user ?? null) as User | null)
        setUserRole((json.userRole ?? null) as UserRole | null)

        const orgs: Organization[] = Array.isArray(json.organizations) ? json.organizations : []
        setOrganizations(orgs)

        try {
          const savedId = localStorage.getItem("activeOrganizationId")
          const saved = savedId ? orgs.find((o) => o.id === savedId) : null
          if (saved) {
            setOrganizationState(saved)
          } else if (orgs.length > 0) {
            setOrganization(orgs[0])
          } else {
            setOrganization(null)
          }
        } catch {
          if (orgs.length > 0) {
            setOrganization(orgs[0])
          } else {
            setOrganization(null)
          }
        }

        setLoading(false)
      } catch {
        if (!isMounted) return
        setUser(null)
        setUserRole(null)
        setOrganization(null)
        setOrganizations([])
        setLoading(false)
      }
    }

    hydrateFromServer()

    // Use Supabase client only for the auth change signal; data still comes from /api/me.
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
    // Also call server endpoint to clear server-side cookies used by SSR
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" })
    } catch {
      // ignore
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
