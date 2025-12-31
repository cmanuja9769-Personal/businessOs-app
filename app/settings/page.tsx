import { getSettings } from "./actions"
import { SettingsForm } from "@/components/settings/settings-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Building2, Palette, SettingsIcon, CreditCard } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export default async function SettingsPage() {
  const settings = await getSettings()

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
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Business Profile</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <p className="text-2xl font-bold">{settings.businessName}</p>
                  {settings.businessGst && (
                    <Badge variant="outline" className="text-xs font-mono">
                      GSTIN: {settings.businessGst}
                    </Badge>
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

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Template</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <p className="text-2xl font-bold capitalize">{settings.invoiceTemplate}</p>
                  <p className="text-xs text-muted-foreground">Invoice Design</p>
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
