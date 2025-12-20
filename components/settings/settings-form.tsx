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
import { updateSettings, type ISettings } from "@/app/settings/actions"
import { toast } from "sonner"
import { Loader2, Save } from "lucide-react"

interface SettingsFormProps {
  settings: ISettings
}

export function SettingsForm({ settings }: SettingsFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [formData, setFormData] = useState({
    businessName: settings.businessName,
    businessAddress: settings.businessAddress || "",
    businessPhone: settings.businessPhone || "",
    businessEmail: settings.businessEmail || "",
    businessGst: settings.businessGst || "",
    invoicePrefix: settings.invoicePrefix,
    purchasePrefix: settings.purchasePrefix,
    taxEnabled: settings.taxEnabled,
    defaultTaxRate: settings.defaultTaxRate,
    currencySymbol: settings.currencySymbol,
    dateFormat: settings.dateFormat,
    financialYearStart: settings.financialYearStart,
    lowStockAlert: settings.lowStockAlert,
  })

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
      <div className="grid gap-6 md:grid-cols-2">
        {/* Business Information */}
        <div className="space-y-4">
          <h3 className="font-semibold">Business Information</h3>

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
            <Input
              id="businessGst"
              name="businessGst"
              value={formData.businessGst}
              onChange={(e) => setFormData({ ...formData, businessGst: e.target.value })}
              placeholder="22AAAAA0000A1Z5"
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

        {/* Application Settings */}
        <div className="space-y-4">
          <h3 className="font-semibold">Application Settings</h3>

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
            <Label htmlFor="financialYearStart">Financial Year Start Month *</Label>
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
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending} size="lg">
          {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save Settings
        </Button>
      </div>
    </form>
  )
}
