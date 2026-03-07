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
import { DataExportSection } from "@/components/settings/data-export-section"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Loader2, Save, Search, AlertTriangle, Bell, Globe, Hash } from "lucide-react"

interface SettingsFormProps {
  settings: ISettings
  organization?: IOrganization | null
  activeTab?: "business" | "invoice" | "payment" | "preferences"
}

export function SettingsForm({ settings, organization, activeTab = "business" }: SettingsFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isFetchingGST, setIsFetchingGST] = useState(false)
  
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
    bankAccountHolderName: settings.bankAccountHolderName || "",
    bankBranchName: settings.bankBranchName || "",
    invoiceTemplate: settings.invoiceTemplate,
    templateColor: settings.templateColor,
    customTerms: settings.customTerms || "",
    invoiceFooter: settings.invoiceFooter || "",
    defaultNotes: settings.defaultNotes || "",
    invoicePrefix: settings.invoicePrefix,
    purchasePrefix: settings.purchasePrefix,
    quotationPrefix: settings.quotationPrefix,
    proformaPrefix: settings.proformaPrefix,
    salesOrderPrefix: settings.salesOrderPrefix,
    deliveryChallanPrefix: settings.deliveryChallanPrefix,
    creditNotePrefix: settings.creditNotePrefix,
    debitNotePrefix: settings.debitNotePrefix,
    taxEnabled: settings.taxEnabled,
    defaultTaxRate: settings.defaultTaxRate,
    currencySymbol: settings.currencySymbol,
    dateFormat: settings.dateFormat,
    financialYearStart: settings.financialYearStart,
    lowStockAlert: settings.lowStockAlert,
    lowStockThreshold: settings.lowStockThreshold,
    defaultPaymentTermsDays: settings.defaultPaymentTermsDays,
    defaultBillingMode: settings.defaultBillingMode,
    defaultPricingMode: settings.defaultPricingMode,
    defaultPackingType: settings.defaultPackingType,
    showAmountInWords: settings.showAmountInWords,
    roundOffTotal: settings.roundOffTotal,
    invoiceNumberResetMode: settings.invoiceNumberResetMode,
    nextInvoiceNumber: settings.nextInvoiceNumber,
    multiCurrencyEnabled: settings.multiCurrencyEnabled,
    secondaryCurrencies: settings.secondaryCurrencies,
    emailNotificationsEnabled: settings.emailNotificationsEnabled,
    emailOnInvoiceCreated: settings.emailOnInvoiceCreated,
    emailOnPaymentReceived: settings.emailOnPaymentReceived,
    emailOnLowStock: settings.emailOnLowStock,
    notificationEmail: settings.notificationEmail,
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
              <CardTitle>Terms, Notes & Footer</CardTitle>
              <CardDescription>Default text auto-applied when creating new invoices</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customTerms">Default Terms & Conditions</Label>
                <Textarea
                  id="customTerms"
                  name="customTerms"
                  value={formData.customTerms}
                  onChange={(e) => setFormData({ ...formData, customTerms: e.target.value })}
                  placeholder="1. Payment due within 30 days&#10;2. Late payment fees may apply&#10;3. Goods once sold will not be taken back"
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">Printed at the bottom of every invoice</p>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="defaultNotes">Default Invoice Notes</Label>
                <Textarea
                  id="defaultNotes"
                  name="defaultNotes"
                  value={formData.defaultNotes}
                  onChange={(e) => setFormData({ ...formData, defaultNotes: e.target.value })}
                  placeholder="e.g., Thank you for your business! For queries, contact us at..."
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">Pre-filled notes on new invoices (editable per invoice)</p>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="invoiceFooter">Invoice Footer Line</Label>
                <Input
                  id="invoiceFooter"
                  name="invoiceFooter"
                  value={formData.invoiceFooter}
                  onChange={(e) => setFormData({ ...formData, invoiceFooter: e.target.value })}
                  placeholder="Thank you for your business!"
                />
                <p className="text-xs text-muted-foreground">Short line printed at the very bottom of the invoice</p>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {activeTab === "payment" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Bank Account Details</CardTitle>
              <CardDescription>These details are printed on your invoices for bank transfer payments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="bankAccountHolderName">Account Holder Name</Label>
                  <Input
                    id="bankAccountHolderName"
                    name="bankAccountHolderName"
                    value={formData.bankAccountHolderName}
                    onChange={(e) => setFormData({ ...formData, bankAccountHolderName: e.target.value })}
                    placeholder="Business Name or Proprietor Name"
                  />
                </div>

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
                  <Label htmlFor="bankBranchName">Branch Name</Label>
                  <Input
                    id="bankBranchName"
                    name="bankBranchName"
                    value={formData.bankBranchName}
                    onChange={(e) => setFormData({ ...formData, bankBranchName: e.target.value })}
                    placeholder="Main Branch, Mumbai"
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

          <Card>
            <CardHeader>
              <CardTitle>Default Payment Terms</CardTitle>
              <CardDescription>Auto-applied to new invoices — customers see the due date based on this</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="defaultPaymentTermsDays">Payment Due In (Days)</Label>
                  <Select
                    name="defaultPaymentTermsDays"
                    value={formData.defaultPaymentTermsDays.toString()}
                    onValueChange={(value) => setFormData({ ...formData, defaultPaymentTermsDays: Number(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Due on Receipt</SelectItem>
                      <SelectItem value="7">Net 7 (7 days)</SelectItem>
                      <SelectItem value="15">Net 15 (15 days)</SelectItem>
                      <SelectItem value="30">Net 30 (30 days)</SelectItem>
                      <SelectItem value="45">Net 45 (45 days)</SelectItem>
                      <SelectItem value="60">Net 60 (60 days)</SelectItem>
                      <SelectItem value="90">Net 90 (90 days)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {formData.defaultPaymentTermsDays === 0
                      ? "Payment is expected immediately upon receipt"  
                      : `Due date will be set to ${formData.defaultPaymentTermsDays} days from invoice date`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {(formData.bankName || formData.bankAccountNo || formData.upiId) && (
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle className="text-sm">Bank Details Preview (as shown on invoices)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg bg-muted/50 p-4 font-mono text-sm space-y-1">
                  {formData.bankAccountHolderName && <p>Account Holder: {formData.bankAccountHolderName}</p>}
                  {formData.bankName && <p>Bank: {formData.bankName}</p>}
                  {formData.bankBranchName && <p>Branch: {formData.bankBranchName}</p>}
                  {formData.bankAccountNo && <p>A/C No: {formData.bankAccountNo}</p>}
                  {formData.bankIfsc && <p>IFSC: {formData.bankIfsc}</p>}
                  {formData.upiId && (
                    <>
                      <Separator className="my-2" />
                      <p>UPI: {formData.upiId}</p>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {activeTab === "preferences" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Document Number Prefixes</CardTitle>
              <CardDescription>Customize the prefix for each document type (e.g., INV-001, QTN-001)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 grid-cols-2 md:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="invoicePrefix">Invoice *</Label>
                  <Input
                    id="invoicePrefix"
                    name="invoicePrefix"
                    value={formData.invoicePrefix}
                    onChange={(e) => setFormData({ ...formData, invoicePrefix: e.target.value.toUpperCase() })}
                    placeholder="INV"
                    required
                    maxLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="purchasePrefix">Purchase *</Label>
                  <Input
                    id="purchasePrefix"
                    name="purchasePrefix"
                    value={formData.purchasePrefix}
                    onChange={(e) => setFormData({ ...formData, purchasePrefix: e.target.value.toUpperCase() })}
                    placeholder="PO"
                    required
                    maxLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quotationPrefix">Quotation</Label>
                  <Input
                    id="quotationPrefix"
                    name="quotationPrefix"
                    value={formData.quotationPrefix}
                    onChange={(e) => setFormData({ ...formData, quotationPrefix: e.target.value.toUpperCase() })}
                    placeholder="QTN"
                    maxLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="proformaPrefix">Proforma</Label>
                  <Input
                    id="proformaPrefix"
                    name="proformaPrefix"
                    value={formData.proformaPrefix}
                    onChange={(e) => setFormData({ ...formData, proformaPrefix: e.target.value.toUpperCase() })}
                    placeholder="PI"
                    maxLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="salesOrderPrefix">Sales Order</Label>
                  <Input
                    id="salesOrderPrefix"
                    name="salesOrderPrefix"
                    value={formData.salesOrderPrefix}
                    onChange={(e) => setFormData({ ...formData, salesOrderPrefix: e.target.value.toUpperCase() })}
                    placeholder="SO"
                    maxLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deliveryChallanPrefix">Delivery Challan</Label>
                  <Input
                    id="deliveryChallanPrefix"
                    name="deliveryChallanPrefix"
                    value={formData.deliveryChallanPrefix}
                    onChange={(e) => setFormData({ ...formData, deliveryChallanPrefix: e.target.value.toUpperCase() })}
                    placeholder="DC"
                    maxLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="creditNotePrefix">Credit Note</Label>
                  <Input
                    id="creditNotePrefix"
                    name="creditNotePrefix"
                    value={formData.creditNotePrefix}
                    onChange={(e) => setFormData({ ...formData, creditNotePrefix: e.target.value.toUpperCase() })}
                    placeholder="CN"
                    maxLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="debitNotePrefix">Debit Note</Label>
                  <Input
                    id="debitNotePrefix"
                    name="debitNotePrefix"
                    value={formData.debitNotePrefix}
                    onChange={(e) => setFormData({ ...formData, debitNotePrefix: e.target.value.toUpperCase() })}
                    placeholder="DN"
                    maxLength={6}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hash className="h-5 w-5" />
                Invoice Numbering
              </CardTitle>
              <CardDescription>Control how invoice numbers reset and set the next number in the sequence</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="invoiceNumberResetMode">Number Reset Cycle</Label>
                  <Select
                    name="invoiceNumberResetMode"
                    value={formData.invoiceNumberResetMode}
                    onValueChange={(value) => setFormData({ ...formData, invoiceNumberResetMode: value as "never" | "yearly" | "monthly" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="never">Never (continuous)</SelectItem>
                      <SelectItem value="yearly">Reset every Financial Year</SelectItem>
                      <SelectItem value="monthly">Reset every Month</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {formData.invoiceNumberResetMode === "never" && "Invoice numbers increment continuously without resetting"}
                    {formData.invoiceNumberResetMode === "yearly" && "Numbers reset to 1 at the start of each financial year"}
                    {formData.invoiceNumberResetMode === "monthly" && "Numbers reset to 1 at the start of each month"}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nextInvoiceNumber">Next Invoice Number</Label>
                  <Input
                    id="nextInvoiceNumber"
                    name="nextInvoiceNumber"
                    type="number"
                    min="1"
                    value={formData.nextInvoiceNumber}
                    onChange={(e) => setFormData({ ...formData, nextInvoiceNumber: Number(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Next invoice will be: {formData.invoicePrefix}-{String(formData.nextInvoiceNumber).padStart(4, "0")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Invoice Defaults</CardTitle>
              <CardDescription>These defaults are pre-selected when creating new invoices</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="defaultBillingMode">Default Billing Mode</Label>
                  <Select
                    name="defaultBillingMode"
                    value={formData.defaultBillingMode}
                    onValueChange={(value) => setFormData({ ...formData, defaultBillingMode: value as "gst" | "non-gst" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gst">GST Billing</SelectItem>
                      <SelectItem value="non-gst">Non-GST Billing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="defaultPricingMode">Default Pricing Mode</Label>
                  <Select
                    name="defaultPricingMode"
                    value={formData.defaultPricingMode}
                    onValueChange={(value) => setFormData({ ...formData, defaultPricingMode: value as "sale" | "wholesale" | "quantity" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sale">Sale Price</SelectItem>
                      <SelectItem value="wholesale">Wholesale Price</SelectItem>
                      <SelectItem value="quantity">Quantity-Based Price</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="defaultPackingType">Default Packing Type</Label>
                  <Select
                    name="defaultPackingType"
                    value={formData.defaultPackingType}
                    onValueChange={(value) => setFormData({ ...formData, defaultPackingType: value as "loose" | "carton" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="loose">Loose (Individual)</SelectItem>
                      <SelectItem value="carton">Carton (Box)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between rounded-2xl glass-subtle p-4">
                  <div className="space-y-0.5">
                    <Label htmlFor="showAmountInWords">Show Amount in Words</Label>
                    <p className="text-sm text-muted-foreground">Display total in words on invoices (e.g., &quot;Five Thousand Rupees Only&quot;)</p>
                  </div>
                  <Switch
                    id="showAmountInWords"
                    checked={formData.showAmountInWords}
                    onCheckedChange={(checked) => setFormData({ ...formData, showAmountInWords: checked })}
                  />
                  <input type="hidden" name="showAmountInWords" value={formData.showAmountInWords.toString()} />
                </div>

                <div className="flex items-center justify-between rounded-2xl glass-subtle p-4">
                  <div className="space-y-0.5">
                    <Label htmlFor="roundOffTotal">Round Off Invoice Total</Label>
                    <p className="text-sm text-muted-foreground">Automatically round the final total to the nearest rupee</p>
                  </div>
                  <Switch
                    id="roundOffTotal"
                    checked={formData.roundOffTotal}
                    onCheckedChange={(checked) => setFormData({ ...formData, roundOffTotal: checked })}
                  />
                  <input type="hidden" name="roundOffTotal" value={formData.roundOffTotal.toString()} />
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
                <div className="flex items-center justify-between rounded-2xl glass-subtle p-4">
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

                <div className="flex items-center justify-between rounded-2xl glass-subtle p-4">
                  <div className="space-y-0.5">
                    <Label htmlFor="multiCurrencyEnabled" className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Multi-Currency Support
                    </Label>
                    <p className="text-sm text-muted-foreground">Enable invoicing in multiple currencies</p>
                  </div>
                  <Switch
                    id="multiCurrencyEnabled"
                    checked={formData.multiCurrencyEnabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, multiCurrencyEnabled: checked })}
                  />
                  <input type="hidden" name="multiCurrencyEnabled" value={formData.multiCurrencyEnabled.toString()} />
                </div>

                {formData.multiCurrencyEnabled && (
                  <div className="space-y-2 pl-4 border-l-2 border-primary/20">
                    <Label htmlFor="secondaryCurrencies">Additional Currencies</Label>
                    <Input
                      id="secondaryCurrencies"
                      name="secondaryCurrencies"
                      value={formData.secondaryCurrencies}
                      onChange={(e) => setFormData({ ...formData, secondaryCurrencies: e.target.value.toUpperCase() })}
                      placeholder="USD, EUR, GBP"
                    />
                    <p className="text-xs text-muted-foreground">
                      Comma-separated currency codes available when creating invoices
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Inventory & Alerts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-2xl glass-subtle p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="lowStockAlert">Low Stock Alerts</Label>
                  <p className="text-sm text-muted-foreground">Get notified when stock falls below the threshold</p>
                </div>
                <Switch
                  id="lowStockAlert"
                  name="lowStockAlert"
                  checked={formData.lowStockAlert}
                  onCheckedChange={(checked) => setFormData({ ...formData, lowStockAlert: checked })}
                />
                <input type="hidden" name="lowStockAlert" value={formData.lowStockAlert.toString()} />
              </div>

              {formData.lowStockAlert && (
                <div className="space-y-2 pl-4 border-l-2 border-primary/20">
                  <Label htmlFor="lowStockThreshold">Low Stock Threshold</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="lowStockThreshold"
                      name="lowStockThreshold"
                      type="number"
                      min="1"
                      max="10000"
                      value={formData.lowStockThreshold}
                      onChange={(e) => setFormData({ ...formData, lowStockThreshold: Number(e.target.value) })}
                      className="w-32"
                    />
                    <span className="text-sm text-muted-foreground">units</span>
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Items with stock below {formData.lowStockThreshold} units will be flagged
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Custom Invoice Fields</CardTitle>
              <CardDescription>Add extra fields to each invoice line item for tracking custom data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between rounded-2xl glass-subtle p-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-4">
                      <Switch
                        id="customField1Enabled"
                        checked={formData.customField1Enabled}
                        onCheckedChange={(checked) => setFormData({ ...formData, customField1Enabled: checked })}
                      />
                      <Label htmlFor="customField1Enabled" className="cursor-pointer">Custom Text Field</Label>
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

                <div className="flex items-start justify-between rounded-2xl glass-subtle p-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-4">
                      <Switch
                        id="customField2Enabled"
                        checked={formData.customField2Enabled}
                        onCheckedChange={(checked) => setFormData({ ...formData, customField2Enabled: checked })}
                      />
                      <Label htmlFor="customField2Enabled" className="cursor-pointer">Custom Number Field</Label>
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

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Email Notifications
              </CardTitle>
              <CardDescription>Configure email alerts for important business events</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-2xl glass-subtle p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="emailNotificationsEnabled">Enable Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Master toggle for all email alerts</p>
                </div>
                <Switch
                  id="emailNotificationsEnabled"
                  checked={formData.emailNotificationsEnabled}
                  onCheckedChange={(checked) => setFormData({ ...formData, emailNotificationsEnabled: checked })}
                />
                <input type="hidden" name="emailNotificationsEnabled" value={formData.emailNotificationsEnabled.toString()} />
              </div>

              {formData.emailNotificationsEnabled && (
                <div className="space-y-4 pl-4 border-l-2 border-primary/20">
                  <div className="space-y-2">
                    <Label htmlFor="notificationEmail">Notification Email Address</Label>
                    <Input
                      id="notificationEmail"
                      name="notificationEmail"
                      type="email"
                      value={formData.notificationEmail}
                      onChange={(e) => setFormData({ ...formData, notificationEmail: e.target.value })}
                      placeholder="alerts@yourbusiness.com"
                    />
                    <p className="text-xs text-muted-foreground">All notifications will be sent to this address</p>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between rounded-2xl glass-subtle p-4">
                    <div className="space-y-0.5">
                      <Label htmlFor="emailOnInvoiceCreated">Invoice Created</Label>
                      <p className="text-sm text-muted-foreground">Send confirmation when a new invoice is generated</p>
                    </div>
                    <Switch
                      id="emailOnInvoiceCreated"
                      checked={formData.emailOnInvoiceCreated}
                      onCheckedChange={(checked) => setFormData({ ...formData, emailOnInvoiceCreated: checked })}
                    />
                    <input type="hidden" name="emailOnInvoiceCreated" value={formData.emailOnInvoiceCreated.toString()} />
                  </div>

                  <div className="flex items-center justify-between rounded-2xl glass-subtle p-4">
                    <div className="space-y-0.5">
                      <Label htmlFor="emailOnPaymentReceived">Payment Received</Label>
                      <p className="text-sm text-muted-foreground">Notify when a payment is recorded against an invoice</p>
                    </div>
                    <Switch
                      id="emailOnPaymentReceived"
                      checked={formData.emailOnPaymentReceived}
                      onCheckedChange={(checked) => setFormData({ ...formData, emailOnPaymentReceived: checked })}
                    />
                    <input type="hidden" name="emailOnPaymentReceived" value={formData.emailOnPaymentReceived.toString()} />
                  </div>

                  <div className="flex items-center justify-between rounded-2xl glass-subtle p-4">
                    <div className="space-y-0.5">
                      <Label htmlFor="emailOnLowStock">Low Stock Warning</Label>
                      <p className="text-sm text-muted-foreground">Alert when any item falls below the low stock threshold</p>
                    </div>
                    <Switch
                      id="emailOnLowStock"
                      checked={formData.emailOnLowStock}
                      onCheckedChange={(checked) => setFormData({ ...formData, emailOnLowStock: checked })}
                    />
                    <input type="hidden" name="emailOnLowStock" value={formData.emailOnLowStock.toString()} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <DataExportSection />
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
