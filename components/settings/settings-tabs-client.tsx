"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Building2, Palette, SettingsIcon, CreditCard, Mail, Phone, MapPin, Banknote, FileText, Package, Receipt, Hash, Globe, Bell, Database } from "lucide-react"
import { SettingsForm } from "@/components/settings/settings-form"
import type { ISettings, IOrganization } from "@/app/settings/actions"

interface SettingsTabsClientProps {
  settings: ISettings
  organization?: IOrganization | null
}

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

const PAYMENT_TERMS_LABEL: Record<number, string> = {
  0: "Due on Receipt",
  7: "Net 7",
  15: "Net 15",
  30: "Net 30",
  45: "Net 45",
  60: "Net 60",
  90: "Net 90",
}

const RESET_MODE_LABEL: Record<string, string> = {
  never: "Continuous",
  yearly: "Yearly Reset",
  monthly: "Monthly Reset",
}

export function SettingsTabsClient({ settings, organization }: SettingsTabsClientProps) {
  const hasBankDetails = settings.bankName || settings.bankAccountNo
  const hasUpi = !!settings.upiId

  return (
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

        <SettingsForm settings={settings} organization={organization} activeTab="business" />
      </TabsContent>

      <TabsContent value="invoice" className="space-y-6">
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Active Template</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <span className="text-lg font-semibold capitalize">{settings.invoiceTemplate}</span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div className="h-4 w-4 rounded-full border" style={{ backgroundColor: settings.templateColor }} />
                <span className="text-xs text-muted-foreground font-mono">{settings.templateColor}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Branding</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Logo</span>
                  <Badge variant={settings.businessLogoUrl ? "default" : "secondary"} className="text-xs">
                    {settings.businessLogoUrl ? "Uploaded" : "Not set"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Signature</span>
                  <Badge variant={settings.signatureImageUrl ? "default" : "secondary"} className="text-xs">
                    {settings.signatureImageUrl ? "Uploaded" : "Not set"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Terms & Footer</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Terms</span>
                  <Badge variant={settings.customTerms ? "default" : "secondary"} className="text-xs">
                    {settings.customTerms ? "Configured" : "Not set"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Footer</span>
                  <Badge variant={settings.invoiceFooter ? "default" : "secondary"} className="text-xs">
                    {settings.invoiceFooter ? "Configured" : "Not set"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Default Notes</span>
                  <Badge variant={settings.defaultNotes ? "default" : "secondary"} className="text-xs">
                    {settings.defaultNotes ? "Configured" : "Not set"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <SettingsForm settings={settings} activeTab="invoice" />
      </TabsContent>

      <TabsContent value="payment" className="space-y-6">
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Bank Account</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Banknote className="h-5 w-5 text-muted-foreground" />
                <span className="text-lg font-semibold">
                  {hasBankDetails ? settings.bankName || "Configured" : "Not configured"}
                </span>
              </div>
              {hasBankDetails && settings.bankAccountNo && (
                <p className="mt-1 text-xs text-muted-foreground font-mono">
                  A/C: ****{settings.bankAccountNo.slice(-4)}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">UPI Payment</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant={hasUpi ? "default" : "secondary"}>
                {hasUpi ? settings.upiId : "Not configured"}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Payment Terms</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-muted-foreground" />
                <span className="text-lg font-semibold">
                  {PAYMENT_TERMS_LABEL[settings.defaultPaymentTermsDays] || `${settings.defaultPaymentTermsDays} days`}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Default payment terms for new invoices</p>
            </CardContent>
          </Card>
        </div>

        <SettingsForm settings={settings} activeTab="payment" />
      </TabsContent>

      <TabsContent value="preferences" className="space-y-6">
        <div className="grid gap-4 sm:gap-6 grid-cols-2 sm:grid-cols-4 lg:grid-cols-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Billing Mode</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="outline" className="text-xs uppercase">
                {settings.defaultBillingMode}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Pricing Mode</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="outline" className="text-xs capitalize">
                {settings.defaultPricingMode}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Invoice Numbering</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {RESET_MODE_LABEL[settings.invoiceNumberResetMode] || "Continuous"}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Multi-Currency</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <Badge variant={settings.multiCurrencyEnabled ? "default" : "secondary"} className="text-xs">
                  {settings.multiCurrencyEnabled ? "Enabled" : "Off"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Notifications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <Badge variant={settings.emailNotificationsEnabled ? "default" : "secondary"} className="text-xs">
                  {settings.emailNotificationsEnabled ? "Active" : "Off"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Stock Alert</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {settings.lowStockAlert ? `Below ${settings.lowStockThreshold}` : "Disabled"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <SettingsForm settings={settings} activeTab="preferences" />
      </TabsContent>
    </Tabs>
  )
}
