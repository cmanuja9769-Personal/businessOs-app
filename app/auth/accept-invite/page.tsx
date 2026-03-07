"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, CheckCircle2, XCircle, Loader2, Shield } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

const ONBOARDING_PATH = "/onboarding"
const DASHBOARD_PATH = "/dashboard"

interface PendingInvitation {
  readonly id: string
  readonly organization_id: string
  readonly role: string
  readonly token: string
  readonly expires_at: string
  readonly org_name: string | null
}

export default function AcceptInvitePage() {
  const [invitations, setInvitations] = useState<PendingInvitation[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    async function fetchInvitations() {
      try {
        const res = await fetch("/api/me", { credentials: "include" })
        const data = await res.json()

        if (!data.user) {
          router.push("/auth/login")
          return
        }

        const pending = data.pendingInvitations ?? []
        if (pending.length === 0 && data.organizations?.length > 0) {
          router.push(DASHBOARD_PATH)
          return
        }
        if (pending.length === 0) {
          router.push(ONBOARDING_PATH)
          return
        }
        setInvitations(pending)
      } catch {
        toast({
          title: "Error",
          description: "Failed to load invitations",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }
    fetchInvitations()
  }, [router, toast])

  const handleAction = useCallback(async (invitationId: string, action: "accept" | "decline") => {
    setProcessing(invitationId)
    try {
      const res = await fetch("/api/organizations/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId, action }),
      })

      const result = await res.json()

      if (!res.ok) {
        toast({
          title: "Error",
          description: result.error || "Something went wrong",
          variant: "destructive",
        })
        return
      }

      if (action === "accept") {
        toast({
          title: "Joined organization!",
          description: "Redirecting to your dashboard...",
        })
        setTimeout(() => {
          router.push(DASHBOARD_PATH)
          router.refresh()
        }, 1000)
      } else {
        setInvitations((prev) => prev.filter((inv) => inv.id !== invitationId))
        toast({
          title: "Invitation declined",
          description: "You can create your own organization instead.",
        })
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to process invitation",
        variant: "destructive",
      })
    } finally {
      setProcessing(null)
    }
  }, [router, toast])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (invitations.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30 p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
            <CardTitle>No Pending Invitations</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              You don&apos;t have any pending invitations. Create your own organization to get started.
            </p>
            <Button onClick={() => router.push(ONBOARDING_PATH)} className="w-full">
              Create Organization
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 p-4 sm:p-6">
      <div className="max-w-lg mx-auto pt-8 sm:pt-16">
        <div className="text-center mb-6">
          <Shield className="h-12 w-12 mx-auto text-primary mb-3" />
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Organization Invitations</h1>
          <p className="text-muted-foreground mt-1">
            You have been invited to join the following organizations
          </p>
        </div>

        <div className="space-y-4">
          {invitations.map((inv) => (
            <Card key={inv.id}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-primary/10">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg truncate">
                      {inv.org_name || "Unknown Organization"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Role: <span className="font-medium capitalize">{inv.role}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Expires: {new Date(inv.expires_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 mt-4">
                  <Button
                    onClick={() => handleAction(inv.id, "accept")}
                    disabled={processing !== null}
                    className="flex-1"
                  >
                    {processing === inv.id ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                    )}
                    Accept
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleAction(inv.id, "decline")}
                    disabled={processing !== null}
                    className="flex-1"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Decline
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground mb-2">
            Or create your own organization instead
          </p>
          <Button variant="outline" onClick={() => router.push(ONBOARDING_PATH)}>
            <Building2 className="h-4 w-4 mr-2" />
            Create New Organization
          </Button>
        </div>
      </div>
    </div>
  )
}
