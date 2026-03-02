"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"
import type { SupabaseClient } from "@supabase/supabase-js"

function validatePasswords(password: string, confirmPassword: string): string | null {
  if (password !== confirmPassword) return "Passwords do not match"
  if (password.length < 6) return "Password must be at least 6 characters"
  return null
}

async function assignDefaultRole(supabase: SupabaseClient, userId: string) {
  const { data: existingRoles } = await supabase.from("user_roles").select("id").limit(1)
  const isFirstUser = !existingRoles || existingRoles.length === 0
  const defaultRole = isFirstUser ? "admin" : "user"

  const { error: roleError } = await supabase.from("user_roles").insert({
    user_id: userId,
    role: defaultRole,
    permissions: {},
  })

  if (roleError) {
    console.error("[v0] Error creating user role:", roleError)
  }
}

function needsEmailConfirmation(session: unknown, identities: unknown[] | undefined): boolean {
  return session === null && (!identities || identities.length === 0)
}

function extractErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "An error occurred"
}

export function SignupForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const { toast } = useToast()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    const validationError = validatePasswords(password, confirmPassword)
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            email_confirm: true,
          },
        },
      })

      if (signUpError) {
        setError(signUpError.message)
        toast({
          title: "Signup failed",
          description: signUpError.message,
          variant: "destructive",
        })
        return
      }

      if (!data.user) return

      await assignDefaultRole(supabase, data.user.id)

      if (needsEmailConfirmation(data.session, data.user.identities)) {
        toast({
          title: "Check your email!",
          description: "We sent you a confirmation link. Click it to activate your account.",
        })
        router.push("/auth/login?message=check-email")
        return
      }

      toast({
        title: "Account created!",
        description: "Redirecting to setup...",
      })
      router.push("/onboarding")
      router.refresh()
    } catch (err) {
      const message = extractErrorMessage(err)
      setError(message)
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSignup} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium text-foreground">
          Email address
        </label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          required
          className="w-full"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium text-foreground">
          Password
        </label>
        <Input
          id="password"
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          required
          className="w-full"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="confirm-password" className="text-sm font-medium text-foreground">
          Confirm password
        </label>
        <Input
          id="confirm-password"
          type="password"
          placeholder="Confirm your password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={loading}
          required
          className="w-full"
        />
      </div>

      {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}

      <Button type="submit" disabled={loading} className="w-full" size="lg">
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Creating account...
          </>
        ) : (
          "Create account"
        )}
      </Button>

      <p className="text-xs text-muted-foreground text-center">Password must be at least 6 characters long</p>
    </form>
  )
}
