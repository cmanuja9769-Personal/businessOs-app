"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Trash2 } from "lucide-react"
import type { IItem, IInvoiceItem, BillingMode, PricingMode } from "@/types"
import { calculateItemAmount } from "@/lib/invoice-calculations"
import { useEffect } from "react"
import { ItemSelect } from "@/components/items/item-select"

interface InvoiceTableProps {
  items: IItem[]
  invoiceItems: IInvoiceItem[]
  onItemsChange: (items: IInvoiceItem[]) => void
  billingMode: BillingMode
  pricingMode: PricingMode // Added pricing mode prop
}

export function InvoiceTable({ items, invoiceItems, onItemsChange, billingMode, pricingMode }: InvoiceTableProps) {
  useEffect(() => {
    if (invoiceItems.length === 0) return

    const updatedItems = invoiceItems.map((invoiceItem) => {
      if (!invoiceItem.itemId) return invoiceItem

      const selectedItem = items.find((i) => i.id === invoiceItem.itemId)
      if (!selectedItem) return invoiceItem

      const newRate = getPriceByMode(selectedItem)
      const newAmount = calculateItemAmount(
        invoiceItem.quantity,
        newRate,
        invoiceItem.gstRate,
        invoiceItem.cessRate,
        invoiceItem.discount,
        billingMode,
      )

      return {
        ...invoiceItem,
        rate: newRate,
        amount: newAmount,
      }
    })

    onItemsChange(updatedItems)
  }, [pricingMode]) // Only re-run when pricing mode changes

  const addRow = () => {
    onItemsChange([
      ...invoiceItems,
      {
        itemId: "",
        itemName: "",
        quantity: 1,
        unit: "",
        rate: 0,
        gstRate: 0,
        cessRate: 0,
        discount: 0,
        amount: 0,
      },
    ])
  }

  const removeRow = (index: number) => {
    onItemsChange(invoiceItems.filter((_, i) => i !== index))
  }

  const getPriceByMode = (item: IItem): number => {
    switch (pricingMode) {
      case "wholesale":
        return item.wholesalePrice || item.salePrice
      case "quantity":
        return item.quantityPrice || item.salePrice
      case "sale":
      default:
        return item.salePrice
    }
  }

  const updateRow = (index: number, field: keyof IInvoiceItem, value: unknown) => {
    const updatedItems = [...invoiceItems]
    const item = { ...updatedItems[index], [field]: value }

    // Auto-calculate amount
    if (["quantity", "rate", "gstRate", "cessRate", "discount"].includes(field)) {
      item.amount = calculateItemAmount(
        item.quantity,
        item.rate,
        item.gstRate,
        item.cessRate,
        item.discount,
        billingMode,
      )
    }

    if (field === "itemId" && value) {
      const selectedItem = items.find((i) => i.id === value)
      if (selectedItem) {
        item.itemName = selectedItem.name
        item.unit = selectedItem.unit
        item.rate = getPriceByMode(selectedItem) // Use pricing mode to determine rate
        item.gstRate = selectedItem.gstRate
        item.cessRate = selectedItem.cessRate
        item.amount = calculateItemAmount(
          item.quantity,
          getPriceByMode(selectedItem),
          selectedItem.gstRate,
          selectedItem.cessRate,
          item.discount,
          billingMode,
        )
      }
    }

    updatedItems[index] = item
    onItemsChange(updatedItems)
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[250px]">Item</TableHead>
              <TableHead className="w-[100px]">Quantity</TableHead>
              <TableHead className="w-[80px]">Unit</TableHead>
              <TableHead className="w-[120px]">Rate</TableHead>
              {billingMode === "gst" && <TableHead className="w-[80px]">GST %</TableHead>}
              <TableHead className="w-[100px]">Discount %</TableHead>
              <TableHead className="w-[120px]">Amount</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoiceItems.map((invoiceItem, index) => (
              <TableRow key={index}>
                <TableCell>
                  <ItemSelect
                    items={items}
                    value={invoiceItem.itemId}
                    onValueChange={(value) => updateRow(index, "itemId", value)}
                    placeholder="Select item"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    step="0.01"
                    value={invoiceItem.quantity}
                    onChange={(e) => updateRow(index, "quantity", Number.parseFloat(e.target.value) || 0)}
                  />
                </TableCell>
                <TableCell>
                  <Input value={invoiceItem.unit} disabled className="bg-muted" />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    step="0.01"
                    value={invoiceItem.rate}
                    onChange={(e) => updateRow(index, "rate", Number.parseFloat(e.target.value) || 0)}
                  />
                </TableCell>
                {billingMode === "gst" && (
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      value={invoiceItem.gstRate}
                      onChange={(e) => updateRow(index, "gstRate", Number.parseFloat(e.target.value) || 0)}
                    />
                  </TableCell>
                )}
                <TableCell>
                  <Input
                    type="number"
                    step="0.01"
                    value={invoiceItem.discount}
                    onChange={(e) => updateRow(index, "discount", Number.parseFloat(e.target.value) || 0)}
                    placeholder="0"
                  />
                </TableCell>
                <TableCell>
                  <div className="font-medium">₹{invoiceItem.amount.toFixed(2)}</div>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => removeRow(index)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Button variant="outline" onClick={addRow} className="gap-2 bg-transparent">
        <Plus className="w-4 h-4" />
        Add Line Item
      </Button>
    </div>
  )
}
