"use client"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import type { ICustomer, BillingMode, PricingMode } from "@/types"

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
  pricingMode: PricingMode // Added pricing mode prop
  onPricingModeChange: (mode: PricingMode) => void // Added pricing mode change handler
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
}: InvoiceHeaderProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="invoiceNo">Invoice Number</Label>
          <Input id="invoiceNo" value={invoiceNo} disabled className="font-mono" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="customer">
            Customer <span className="text-destructive">*</span>
          </Label>
          <Select
            value={selectedCustomer?.id}
            onValueChange={(value) => {
              const customer = customers.find((c) => c.id === value)
              onCustomerChange(customer || null)
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select customer" />
            </SelectTrigger>
            <SelectContent>
              {customers.map((customer) => (
                <SelectItem key={customer.id} value={customer.id}>
                  <div className="flex flex-col">
                    <span className="font-medium">{customer.name}</span>
                    <span className="text-xs text-muted-foreground">{customer.contactNo}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedCustomer && (
          <div className="p-3 bg-muted/50 rounded-lg space-y-1 text-sm">
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
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="invoiceDate">Invoice Date</Label>
            <Input
              id="invoiceDate"
              type="date"
              value={invoiceDate}
              onChange={(e) => onInvoiceDateChange(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dueDate">Due Date</Label>
            <Input id="dueDate" type="date" value={dueDate} onChange={(e) => onDueDateChange(e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>
            Pricing Mode <span className="text-destructive">*</span>
          </Label>
          <div className="flex gap-2 flex-wrap">
            <Badge
              variant={pricingMode === "sale" ? "default" : "outline"}
              className="cursor-pointer px-4 py-2"
              onClick={() => onPricingModeChange("sale")}
            >
              Sale Price (MRP)
            </Badge>
            <Badge
              variant={pricingMode === "wholesale" ? "default" : "outline"}
              className="cursor-pointer px-4 py-2"
              onClick={() => onPricingModeChange("wholesale")}
            >
              Wholesale Price
            </Badge>
            <Badge
              variant={pricingMode === "quantity" ? "default" : "outline"}
              className="cursor-pointer px-4 py-2"
              onClick={() => onPricingModeChange("quantity")}
            >
              Quantity Price (Bulk)
            </Badge>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Billing Mode</Label>
          <div className="flex gap-2">
            <Badge
              variant={billingMode === "gst" ? "default" : "outline"}
              className="cursor-pointer px-4 py-2"
              onClick={() => onBillingModeChange("gst")}
            >
              GST Billing
            </Badge>
            <Badge
              variant={billingMode === "non-gst" ? "default" : "outline"}
              className="cursor-pointer px-4 py-2"
              onClick={() => onBillingModeChange("non-gst")}
            >
              Non-GST Billing
            </Badge>
          </div>
        </div>
      </div>
    </div>
  )
}
