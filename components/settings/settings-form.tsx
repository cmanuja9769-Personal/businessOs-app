"use client"

import type React from "react"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { updateSettings, type ISettings, type IOrganization } from "@/app/settings/actions"
import { lookupGSTDetails } from "@/app/customers/actions"
import { ImageUpload } from "@/components/settings/image-upload"
import { TemplateSelector } from "@/components/settings/template-selector"
import { ColorPicker } from "@/components/settings/color-picker"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Loader2, Save, Search } from "lucide-react"

interface SettingsFormProps {
  settings: ISettings
  organization?: IOrganization | null
  activeTab?: "business" | "invoice" | "payment" | "preferences"
}

export function SettingsForm({ settings, organization, activeTab = "business" }: SettingsFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isFetchingGST, setIsFetchingGST] = useState(false)
  
  // Use organization data if available, otherwise fall back to settings
  const [formData, setFormData] = useState({
    businessName: organization?.name || settings.businessName,
    businessAddress: organization?.address || settings.businessAddress || "",
    businessPhone: organization?.phone || settings.businessPhone || "",
    businessEmail: organization?.email || settings.businessEmail || "",
    businessGst: organization?.gstNumber || settings.businessGst || "",
    businessPan: organization?.panNumber || settings.businessPan || "",
    businessLogoUrl: settings.businessLogoUrl || "",
    signatureImageUrl: settings.signatureImageUrl || "",
    bankName: settings.bankName || "",
    bankAccountNo: settings.bankAccountNo || "",
    bankIfsc: settings.bankIfsc || "",
    upiId: settings.upiId || "",
    invoiceTemplate: settings.invoiceTemplate,
    templateColor: settings.templateColor,
    customTerms: settings.customTerms || "",
    invoiceFooter: settings.invoiceFooter || "",
    invoicePrefix: settings.invoicePrefix,
    purchasePrefix: settings.purchasePrefix,
    taxEnabled: settings.taxEnabled,
    defaultTaxRate: settings.defaultTaxRate,
    currencySymbol: settings.currencySymbol,
    dateFormat: settings.dateFormat,
    financialYearStart: settings.financialYearStart,
    lowStockAlert: settings.lowStockAlert,
    customField1Enabled: settings.customField1Enabled,
    customField1Label: settings.customField1Label,
    customField2Enabled: settings.customField2Enabled,
    customField2Label: settings.customField2Label,
  })

  // Auto-fetch GST details when valid GSTIN is entered
  const handleGSTLookup = async () => {
    const gstin = formData.businessGst?.trim().toUpperCase()
    
    if (!gstin || gstin.length !== 15) {
      toast.error("Please enter a valid 15-character GST number")
      return
    }

    setIsFetchingGST(true)
    try {
      const result = await lookupGSTDetails(gstin)
      
      if (result.success && result.data) {
        // Auto-fill the form with fetched details
        setFormData({
          ...formData,
          businessName: result.data.legalName || result.data.tradeName || formData.businessName,
          businessAddress: result.data.address || formData.businessAddress,
        })
        
        toast.success("GST details fetched successfully")
      } else {
        toast.error(result.error || "Could not fetch GST details")
      }
    } catch {
      toast.error("Failed to fetch GST details. Please try again.")
    } finally {
      setIsFetchingGST(false)
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    startTransition(async () => {
      const form = new FormData(e.currentTarget)
      const result = await updateSettings(form)

      if (result.success) {
        toast.success("Settings updated successfully")
        router.refresh()
      } else {
        toast.error(result.error || "Failed to update settings")
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {activeTab === "business" && (
        <Card>
          <CardHeader>
            <CardTitle>Business Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="businessName">Business Name *</Label>
                  <Input
                    id="businessName"
                    name="businessName"
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="businessGst">GSTIN Number</Label>
                  <div className="flex gap-2">
                    <Input
                      id="businessGst"
                      name="businessGst"
                      value={formData.businessGst}
                      onChange={(e) => setFormData({ ...formData, businessGst: e.target.value.toUpperCase() })}
                      placeholder="22AAAAA0000A1Z5"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleGSTLookup}
                      disabled={isFetchingGST || !formData.businessGst || formData.businessGst.length !== 15}
                      className="shrink-0"
                    >
                      {isFetchingGST ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Search className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Enter GST number and click search to auto-fill business details
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="businessPan">PAN Number</Label>
                  <Input
                    id="businessPan"
                    name="businessPan"
                    value={formData.businessPan}
                    onChange={(e) => setFormData({ ...formData, businessPan: e.target.value.toUpperCase() })}
                    placeholder="AAAAA0000A"
                    maxLength={10}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="businessPhone">Phone Number</Label>
                  <Input
                    id="businessPhone"
                    name="businessPhone"
                    value={formData.businessPhone}
                    onChange={(e) => setFormData({ ...formData, businessPhone: e.target.value })}
                    placeholder="+91 9876543210"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="businessEmail">Email Address</Label>
                  <Input
                    id="businessEmail"
                    name="businessEmail"
                    type="email"
                    value={formData.businessEmail}
                    onChange={(e) => setFormData({ ...formData, businessEmail: e.target.value })}
                    placeholder="business@example.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="businessAddress">Business Address</Label>
                  <Textarea
                    id="businessAddress"
                    name="businessAddress"
                    value={formData.businessAddress}
                    onChange={(e) => setFormData({ ...formData, businessAddress: e.target.value })}
                    placeholder="Enter your complete business address..."
                    rows={3}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "invoice" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Template & Branding</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <ImageUpload
                  label="Company Logo"
                  name="businessLogoUrl"
                  value={formData.businessLogoUrl}
                  onChange={(url) => setFormData({ ...formData, businessLogoUrl: url })}
                  description="Appears on invoices"
                  aspectRatio="square"
                />

                <ImageUpload
                  label="Signature"
                  name="signatureImageUrl"
                  value={formData.signatureImageUrl}
                  onChange={(url) => setFormData({ ...formData, signatureImageUrl: url })}
                  description="Authorized signatory"
                  aspectRatio="signature"
                />
              </div>

              <Separator />

              <TemplateSelector
                value={formData.invoiceTemplate}
                onChange={(template) => setFormData({ ...formData, invoiceTemplate: template })}
              />

              <ColorPicker
                value={formData.templateColor}
                onChange={(color) => setFormData({ ...formData, templateColor: color })}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Terms & Conditions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customTerms">Default Terms & Conditions</Label>
                <Textarea
                  id="customTerms"
                  name="customTerms"
                  value={formData.customTerms}
                  onChange={(e) => setFormData({ ...formData, customTerms: e.target.value })}
                  placeholder="1. Payment due within 30 days&#10;2. Late payment fees may apply"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="invoiceFooter">Invoice Footer</Label>
                <Input
                  id="invoiceFooter"
                  name="invoiceFooter"
                  value={formData.invoiceFooter}
                  onChange={(e) => setFormData({ ...formData, invoiceFooter: e.target.value })}
                  placeholder="Thank you for your business!"
                />
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {activeTab === "payment" && (
        <Card>
          <CardHeader>
            <CardTitle>Payment Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="bankName">Bank Name</Label>
                <Input
                  id="bankName"
                  name="bankName"
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  placeholder="State Bank of India"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bankAccountNo">Account Number</Label>
                <Input
                  id="bankAccountNo"
                  name="bankAccountNo"
                  value={formData.bankAccountNo}
                  onChange={(e) => setFormData({ ...formData, bankAccountNo: e.target.value })}
                  placeholder="1234567890"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bankIfsc">IFSC Code</Label>
                <Input
                  id="bankIfsc"
                  name="bankIfsc"
                  value={formData.bankIfsc}
                  onChange={(e) => setFormData({ ...formData, bankIfsc: e.target.value.toUpperCase() })}
                  placeholder="SBIN0001234"
                  maxLength={11}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="upiId">UPI ID</Label>
                <Input
                  id="upiId"
                  name="upiId"
                  value={formData.upiId}
                  onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                  placeholder="business@upi"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "preferences" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Document Prefixes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="invoicePrefix">Invoice Prefix *</Label>
                  <Input
                    id="invoicePrefix"
                    name="invoicePrefix"
                    value={formData.invoicePrefix}
                    onChange={(e) => setFormData({ ...formData, invoicePrefix: e.target.value })}
                    placeholder="INV"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="purchasePrefix">Purchase Order Prefix *</Label>
                  <Input
                    id="purchasePrefix"
                    name="purchasePrefix"
                    value={formData.purchasePrefix}
                    onChange={(e) => setFormData({ ...formData, purchasePrefix: e.target.value })}
                    placeholder="PO"
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tax & Currency Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="defaultTaxRate">Default Tax Rate (%) *</Label>
                  <Input
                    id="defaultTaxRate"
                    name="defaultTaxRate"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.defaultTaxRate}
                    onChange={(e) => setFormData({ ...formData, defaultTaxRate: Number(e.target.value) })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currencySymbol">Currency Symbol *</Label>
                  <Input
                    id="currencySymbol"
                    name="currencySymbol"
                    value={formData.currencySymbol}
                    onChange={(e) => setFormData({ ...formData, currencySymbol: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateFormat">Date Format *</Label>
                  <Select
                    name="dateFormat"
                    value={formData.dateFormat}
                    onValueChange={(value) => setFormData({ ...formData, dateFormat: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dd/MM/yyyy">DD/MM/YYYY</SelectItem>
                      <SelectItem value="MM/dd/yyyy">MM/DD/YYYY</SelectItem>
                      <SelectItem value="yyyy-MM-dd">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="financialYearStart">Financial Year Start *</Label>
                  <Select
                    name="financialYearStart"
                    value={formData.financialYearStart.toString()}
                    onValueChange={(value) => setFormData({ ...formData, financialYearStart: Number(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">January</SelectItem>
                      <SelectItem value="2">February</SelectItem>
                      <SelectItem value="3">March</SelectItem>
                      <SelectItem value="4">April</SelectItem>
                      <SelectItem value="5">May</SelectItem>
                      <SelectItem value="6">June</SelectItem>
                      <SelectItem value="7">July</SelectItem>
                      <SelectItem value="8">August</SelectItem>
                      <SelectItem value="9">September</SelectItem>
                      <SelectItem value="10">October</SelectItem>
                      <SelectItem value="11">November</SelectItem>
                      <SelectItem value="12">December</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label htmlFor="taxEnabled">Enable Tax/GST</Label>
                    <p className="text-sm text-muted-foreground">Enable tax calculations for invoices</p>
                  </div>
                  <Switch
                    id="taxEnabled"
                    name="taxEnabled"
                    checked={formData.taxEnabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, taxEnabled: checked })}
                  />
                  <input type="hidden" name="taxEnabled" value={formData.taxEnabled.toString()} />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label htmlFor="lowStockAlert">Low Stock Alerts</Label>
                    <p className="text-sm text-muted-foreground">Get notified when stock is low</p>
                  </div>
                  <Switch
                    id="lowStockAlert"
                    name="lowStockAlert"
                    checked={formData.lowStockAlert}
                    onCheckedChange={(checked) => setFormData({ ...formData, lowStockAlert: checked })}
                  />
                  <input type="hidden" name="lowStockAlert" value={formData.lowStockAlert.toString()} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Custom Invoice Fields</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between rounded-lg border p-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-4">
                      <Switch
                        id="customField1Enabled"
                        checked={formData.customField1Enabled}
                        onCheckedChange={(checked) => setFormData({ ...formData, customField1Enabled: checked })}
                      />
                      <Label htmlFor="customField1Enabled" className="cursor-pointer">Enable Custom Field 1 (Text)</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">Add a text field to each invoice line item</p>
                    <Input
                      id="customField1Label"
                      name="customField1Label"
                      value={formData.customField1Label}
                      onChange={(e) => setFormData({ ...formData, customField1Label: e.target.value })}
                      placeholder="e.g., Serial Number, Batch Code, etc."
                      disabled={!formData.customField1Enabled}
                    />
                  </div>
                  <input type="hidden" name="customField1Enabled" value={formData.customField1Enabled.toString()} />
                </div>

                <div className="flex items-start justify-between rounded-lg border p-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-4">
                      <Switch
                        id="customField2Enabled"
                        checked={formData.customField2Enabled}
                        onCheckedChange={(checked) => setFormData({ ...formData, customField2Enabled: checked })}
                      />
                      <Label htmlFor="customField2Enabled" className="cursor-pointer">Enable Custom Field 2 (Number)</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">Add a numeric field to each invoice line item</p>
                    <Input
                      id="customField2Label"
                      name="customField2Label"
                      value={formData.customField2Label}
                      onChange={(e) => setFormData({ ...formData, customField2Label: e.target.value })}
                      placeholder="e.g., Carton Number, Box Count, etc."
                      disabled={!formData.customField2Enabled}
                    />
                  </div>
                  <input type="hidden" name="customField2Enabled" value={formData.customField2Enabled.toString()} />
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <div className="flex justify-end pt-6">
        <Button type="submit" disabled={isPending} size="lg">
          {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save Settings
        </Button>
      </div>
    </form>
  )
}
