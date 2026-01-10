import { getSettings, getOrganizationDetails } from "./actions"
import { SettingsForm } from "@/components/settings/settings-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, Palette, SettingsIcon, CreditCard, Mail, Phone, MapPin } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { SettingsTabsClient } from "../../components/settings/settings-tabs-client"

// Force dynamic rendering to always fetch fresh data
export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const [settings, organization] = await Promise.all([
    getSettings(),
    getOrganizationDetails()
  ])

  console.log("[settings page] Organization data:", JSON.stringify(organization, null, 2))
  console.log("[settings page] Settings data:", settings.businessName)

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">Manage your business settings and preferences</p>
      </div>

      <SettingsTabsClient settings={settings} organization={organization} />
    </div>
  )
}
