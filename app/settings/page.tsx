import { getSettings, getOrganizationDetails } from "./actions"
import { SettingsForm } from "@/components/settings/settings-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Building2, Palette, SettingsIcon, CreditCard, Mail, Phone, MapPin } from "lucide-react"
import { Badge } from "@/components/ui/badge"

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
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your business settings and preferences</p>
      </div>

      <Tabs defaultValue="business" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 lg:w-auto lg:inline-grid gap-2">
          <TabsTrigger value="business" className="gap-1 sm:gap-2 text-xs sm:text-sm">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Business</span>
          </TabsTrigger>
          <TabsTrigger value="invoice" className="gap-1 sm:gap-2 text-xs sm:text-sm">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Invoice</span>
          </TabsTrigger>
          <TabsTrigger value="payment" className="gap-1 sm:gap-2 text-xs sm:text-sm">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Payment</span>
          </TabsTrigger>
          <TabsTrigger value="preferences" className="gap-1 sm:gap-2 text-xs sm:text-sm">
            <SettingsIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Preferences</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="business" className="space-y-6">
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {/* Organization Profile Card */}
            <Card className="sm:col-span-2 lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-sm">Business Profile</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-2xl font-bold">{organization?.name || settings.businessName}</p>
                  
                  <div className="flex flex-wrap gap-2">
                    {(organization?.gstNumber || settings.businessGst) && (
                      <Badge variant="outline" className="text-xs font-mono">
                        GSTIN: {organization?.gstNumber || settings.businessGst}
                      </Badge>
                    )}
                    {(organization?.panNumber || settings.businessPan) && (
                      <Badge variant="secondary" className="text-xs font-mono">
                        PAN: {organization?.panNumber || settings.businessPan}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact Details Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Contact Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {(organization?.email || settings.businessEmail) && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{organization?.email || settings.businessEmail}</span>
                    </div>
                  )}
                  {(organization?.phone || settings.businessPhone) && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{organization?.phone || settings.businessPhone}</span>
                    </div>
                  )}
                  {(organization?.address || settings.businessAddress) && (
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <span className="text-muted-foreground">{organization?.address || settings.businessAddress}</span>
                    </div>
                  )}
                  {!organization?.email && !organization?.phone && !settings.businessEmail && !settings.businessPhone && (
                    <p className="text-sm text-muted-foreground">No contact details configured</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Tax Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <p className="text-2xl font-bold">{settings.defaultTaxRate}%</p>
                  <p className="text-xs text-muted-foreground">Default GST Rate</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <SettingsForm settings={settings} activeTab="business" />
        </TabsContent>

        <TabsContent value="invoice" className="space-y-6">
          <SettingsForm settings={settings} activeTab="invoice" />
        </TabsContent>

        <TabsContent value="payment" className="space-y-6">
          <SettingsForm settings={settings} activeTab="payment" />
        </TabsContent>

        <TabsContent value="preferences" className="space-y-6">
          <SettingsForm settings={settings} activeTab="preferences" />
        </TabsContent>
      </Tabs>
    </div>
  )
}
