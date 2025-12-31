"use client"

import type React from "react"

import { createContext, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"

export interface UserRole {
  role: "admin" | "salesperson" | "accountant" | "viewer"
  permissions: Record<string, any>
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

  useEffect(() => {
    const supabase = createClient()

    // Get initial user
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      setUser(user)

      if (user) {
        // Fetch user role
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role, permissions")
          .eq("user_id", user.id)
          .single()

        if (roleData) {
          setUserRole(roleData as UserRole)
        }

        // Fetch organizations
        const { data: orgData } = await supabase
          .from("app_user_organizations")
          .select("app_organizations(id, name, email, phone)")
          .eq("user_id", user.id)
          .eq("is_active", true)

        const orgs = orgData?.map((item: any) => item.app_organizations) || []
        setOrganizations(orgs)

        // Set first organization as current
        if (orgs.length > 0) {
          setOrganizationState(orgs[0])
        }
      }

      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user || null)

      if (session?.user) {
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role, permissions")
          .eq("user_id", session.user.id)
          .single()

        if (roleData) {
          setUserRole(roleData as UserRole)
        }

        // Fetch organizations
        const { data: orgData } = await supabase
          .from("app_user_organizations")
          .select("app_organizations(id, name, email, phone)")
          .eq("user_id", session.user.id)
          .eq("is_active", true)

        const orgs = orgData?.map((item: any) => item.app_organizations) || []
        setOrganizations(orgs)

        if (orgs.length > 0) {
          setOrganizationState(orgs[0])
        }
      } else {
        setUserRole(null)
        setOrganizationState(null)
        setOrganizations([])
      }
    })

    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
    setUserRole(null)
    setOrganizationState(null)
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
        setOrganization: setOrganizationState,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
