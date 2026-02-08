"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

export function ResetPasswordForm() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      const { error: updateError } = await supabase.auth.updateUser({
        password,
      })

      if (updateError) {
        setError(updateError.message)
        toast({
          title: "Error",
          description: updateError.message,
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Password updated!",
        description: "Your password has been reset successfully.",
      })

      router.push("/auth/login")
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred"
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
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Password Input */}
      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium text-foreground">
          New Password
        </label>
        <Input
          id="password"
          type="password"
          placeholder="Enter your new password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          required
          className="w-full"
        />
      </div>

      {/* Confirm Password Input */}
      <div className="space-y-2">
        <label htmlFor="confirm-password" className="text-sm font-medium text-foreground">
          Confirm Password
        </label>
        <Input
          id="confirm-password"
          type="password"
          placeholder="Confirm your new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={loading}
          required
          className="w-full"
        />
      </div>

      {/* Error Message */}
      {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}

      {/* Submit Button */}
      <Button type="submit" disabled={loading} className="w-full" size="lg">
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Updating...
          </>
        ) : (
          "Update Password"
        )}
      </Button>

      <p className="text-xs text-muted-foreground text-center">Password must be at least 6 characters long</p>
    </form>
  )
}
