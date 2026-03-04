"use client"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { AsyncCustomerSelect } from "@/components/invoices/async-customer-select"
import type { ICustomer, BillingMode, PricingMode, PackingType } from "@/types"

interface InvoiceHeaderProps {
  invoiceNo: string
  customers: ICustomer[]
  selectedCustomer: ICustomer | null
  onCustomerChange: (customer: ICustomer | null) => void
  invoiceDate: string
  onInvoiceDateChange: (date: string) => void
  dueDate: string
  onDueDateChange: (date: string) => void
  billingMode: BillingMode
  onBillingModeChange: (mode: BillingMode) => void
  pricingMode: PricingMode
  onPricingModeChange: (mode: PricingMode) => void
  packingType: PackingType
  onPackingTypeChange: (type: PackingType) => void
}

export function InvoiceHeader({
  invoiceNo,
  customers,
  selectedCustomer,
  onCustomerChange,
  invoiceDate,
  onInvoiceDateChange,
  dueDate,
  onDueDateChange,
  billingMode,
  onBillingModeChange,
  pricingMode,
  onPricingModeChange,
  packingType,
  onPackingTypeChange,
}: InvoiceHeaderProps) {
  return (
    <div className="space-y-6">
      {/* Row 1: Invoice Number, Dates, and Modes */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="invoiceNo">Invoice Number</Label>
          <Input id="invoiceNo" value={invoiceNo} disabled className="font-mono" />
        </div>

        <div className="space-y-2 md:col-span-1 lg:col-span-2">
          <Label htmlFor="invoiceDate">Invoice Date</Label>
          <Input
            id="invoiceDate"
            type="date"
            value={invoiceDate}
            onChange={(e) => onInvoiceDateChange(e.target.value)}
          />
        </div>

        <div className="space-y-2 md:col-span-1 lg:col-span-2">
          <Label htmlFor="dueDate">Due Date</Label>
          <Input id="dueDate" type="date" value={dueDate} onChange={(e) => onDueDateChange(e.target.value)} />
        </div>
      </div>

      {/* Row 2: Customer and Badge Groups */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="customer">
            Customer <span className="text-destructive">*</span>
          </Label>
          <AsyncCustomerSelect
            value={selectedCustomer}
            onValueChange={onCustomerChange}
            initialCustomers={customers}
          />

          {selectedCustomer && (
            <div className="p-3 bg-muted/50 rounded-lg space-y-1 text-sm mt-2">
              <p className="font-medium">{selectedCustomer.name}</p>
              <p className="text-muted-foreground">{selectedCustomer.contactNo}</p>
              {selectedCustomer.email && <p className="text-muted-foreground">{selectedCustomer.email}</p>}
              {selectedCustomer.gstinNo && (
                <p className="text-muted-foreground">
                  <span className="font-medium">GSTIN:</span> {selectedCustomer.gstinNo}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>
              Pricing Mode <span className="text-destructive">*</span>
            </Label>
            <div className="flex gap-2 flex-wrap">
              <Badge
                variant={pricingMode === "sale" ? "default" : "outline"}
                className="cursor-pointer px-3 py-1.5"
                onClick={() => onPricingModeChange("sale")}
              >
                Sale Price (MRP)
              </Badge>
              <Badge
                variant={pricingMode === "wholesale" ? "default" : "outline"}
                className="cursor-pointer px-3 py-1.5"
                onClick={() => onPricingModeChange("wholesale")}
              >
                Wholesale Price
              </Badge>
              <Badge
                variant={pricingMode === "quantity" ? "default" : "outline"}
                className="cursor-pointer px-3 py-1.5"
                onClick={() => onPricingModeChange("quantity")}
              >
                Quantity Price (Bulk)
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                Packing Type <span className="text-destructive">*</span>
              </Label>
              <div className="flex gap-2">
                <Badge
                  variant={packingType === "loose" ? "default" : "outline"}
                  className="cursor-pointer px-3 py-1.5"
                  onClick={() => onPackingTypeChange("loose")}
                >
                  Loose Quantity
                </Badge>
                <Badge
                  variant={packingType === "carton" ? "default" : "outline"}
                  className="cursor-pointer px-3 py-1.5"
                  onClick={() => onPackingTypeChange("carton")}
                >
                  Pack Cartons
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Billing Mode</Label>
              <div className="flex gap-2">
                <Badge
                  variant={billingMode === "gst" ? "default" : "outline"}
                  className="cursor-pointer px-3 py-1.5"
                  onClick={() => onBillingModeChange("gst")}
                >
                  GST Billing
                </Badge>
                <Badge
                  variant={billingMode === "non-gst" ? "default" : "outline"}
                  className="cursor-pointer px-3 py-1.5"
                  onClick={() => onBillingModeChange("non-gst")}
                >
                  Non-GST Billing
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
