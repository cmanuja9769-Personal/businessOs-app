"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { Loader2 } from "lucide-react"
import { createOrganizationAction } from "@/app/organizations/actions"

export function CreateOrganizationForm() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [address, setAddress] = useState("")
  const [gstNumber, setGstNumber] = useState("")
  const [panNumber, setPanNumber] = useState("")
  const [city, setCity] = useState("")
  const [stateName, setStateName] = useState("")
  const [pincode, setPincode] = useState("")
  const [legalName, setLegalName] = useState("")
  const [tradeName, setTradeName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!name.trim()) {
      setError("Organization name is required")
      return
    }

    if (!email.trim()) {
      setError("Email is required")
      return
    }

    if (!address.trim()) {
      setError("Address is required")
      return
    }
    if (!gstNumber.trim()) {
      setError("GSTIN is required")
      return
    }
    if (!city.trim() || !stateName.trim() || !pincode.trim()) {
      setError("City, State, and Pincode are required")
      return
    }

    setLoading(true)

    try {
      const result = await createOrganizationAction({
        name,
        email,
        phone: phone || undefined,
        address: address || undefined,
        gstNumber,
        panNumber: panNumber || undefined,
        city,
        state: stateName,
        pincode,
        legalName: legalName || undefined,
        tradeName: tradeName || undefined,
      })

      if (result.success) {
        toast({
          title: "Organization created!",
          description: "Your new organization has been set up successfully.",
        })
        router.push("/")
      } else {
        setError(result.error || "Failed to create organization")
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        })
      }
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
    <Card>
      <CardHeader>
        <CardTitle>New Organization Details</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Organization Name */}
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Organization Name
            </label>
            <Input
              id="name"
              placeholder="e.g., Acme Corporation"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="contact@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <label htmlFor="phone" className="text-sm font-medium">
              Phone (Optional)
            </label>
            <Input
              id="phone"
              type="tel"
              placeholder="+91 XXXXX XXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Address */}
          <div className="space-y-2">
            <label htmlFor="address" className="text-sm font-medium">
              Address *
            </label>
            <Input
              id="address"
              placeholder="123 Business Street, City"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          {/* Error Message */}
          {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}

          {/* Submit Button */}

              {/* GSTIN */}
              <div className="space-y-2">
                <label htmlFor="gstNumber" className="text-sm font-medium">
                  GSTIN *
                </label>
                <Input
                  id="gstNumber"
                  placeholder="e.g., 27ABCDE1234F1Z5"
                  value={gstNumber}
                  onChange={(e) => setGstNumber(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              {/* PAN */}
              <div className="space-y-2">
                <label htmlFor="panNumber" className="text-sm font-medium">
                  PAN (Optional)
                </label>
                <Input
                  id="panNumber"
                  placeholder="e.g., ABCDE1234F"
                  value={panNumber}
                  onChange={(e) => setPanNumber(e.target.value)}
                  disabled={loading}
                />
              </div>

              {/* Legal / Trade Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="legalName" className="text-sm font-medium">
                    Legal Name (Optional)
                  </label>
                  <Input
                    id="legalName"
                    placeholder="As per registration"
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="tradeName" className="text-sm font-medium">
                    Trade Name (Optional)
                  </label>
                  <Input
                    id="tradeName"
                    placeholder="Store/brand name"
                    value={tradeName}
                    onChange={(e) => setTradeName(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              {/* City / State / Pincode */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label htmlFor="city" className="text-sm font-medium">
                    City *
                  </label>
                  <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} disabled={loading} required />
                </div>
                <div className="space-y-2">
                  <label htmlFor="stateName" className="text-sm font-medium">
                    State *
                  </label>
                  <Input
                    id="stateName"
                    value={stateName}
                    onChange={(e) => setStateName(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="pincode" className="text-sm font-medium">
                    Pincode *
                  </label>
                  <Input
                    id="pincode"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
              </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Organization"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
