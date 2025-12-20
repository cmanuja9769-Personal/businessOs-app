import { getSettings } from "./actions"
import { SettingsForm } from "@/components/settings/settings-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, FileText, Database } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export default async function SettingsPage() {
  const settings = await getSettings()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your business settings and preferences</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Business Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="text-2xl font-bold">{settings.businessName}</p>
              {settings.businessGst && (
                <Badge variant="outline" className="text-xs">
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
            <CardTitle className="text-sm">Low Stock Alert</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="text-2xl font-bold">{settings.lowStockAlert ? "Enabled" : "Disabled"}</p>
              <p className="text-xs text-muted-foreground">Inventory Monitoring</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Business Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SettingsForm settings={settings} />
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Document Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">Invoice Prefix</p>
                <p className="text-lg font-bold">{settings.invoicePrefix}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Purchase Prefix</p>
                <p className="text-lg font-bold">{settings.purchasePrefix}</p>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Date Format</p>
              <p className="text-muted-foreground">{settings.dateFormat}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Currency Symbol</p>
              <p className="text-lg">{settings.currencySymbol}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Data Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Export Data</p>
              <p className="text-sm text-muted-foreground mb-2">Download your business data for backup or analysis</p>
              <Button variant="outline" className="w-full bg-transparent" disabled>
                Export All Data (Coming Soon)
              </Button>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Database Backup</p>
              <p className="text-sm text-muted-foreground mb-2">Create a complete backup of your database</p>
              <Button variant="outline" className="w-full bg-transparent" disabled>
                Create Backup (Coming Soon)
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
