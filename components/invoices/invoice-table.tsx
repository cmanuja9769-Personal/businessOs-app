"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, Barcode } from "lucide-react";
import type { IItem, IInvoiceItem, BillingMode, PricingMode } from "@/types";
import { calculateItemAmount } from "@/lib/invoice-calculations";
import { useEffect, useRef, useState } from "react";
import { ItemSelect } from "@/components/items/item-select";
import { toast } from "sonner";

interface InvoiceTableProps {
  items: IItem[];
  invoiceItems: IInvoiceItem[];
  onItemsChange: (items: IInvoiceItem[]) => void;
  billingMode: BillingMode;
  pricingMode: PricingMode; // Added pricing mode prop
}

export function InvoiceTable({
  items,
  invoiceItems,
  onItemsChange,
  billingMode,
  pricingMode,
}: InvoiceTableProps) {
  const [barcodeInput, setBarcodeInput] = useState("");
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (invoiceItems.length === 0) return;

    const updatedItems = invoiceItems.map((invoiceItem) => {
      if (!invoiceItem.itemId) return invoiceItem;

      const selectedItem = items.find((i) => i.id === invoiceItem.itemId);
      if (!selectedItem) return invoiceItem;

      const newRate = getPriceByMode(selectedItem);
      const newAmount = calculateItemAmount(
        invoiceItem.quantity,
        newRate,
        invoiceItem.gstRate,
        invoiceItem.cessRate,
        invoiceItem.discount,
        billingMode
      );

      return {
        ...invoiceItem,
        rate: newRate,
        amount: newAmount,
      };
    });

    onItemsChange(updatedItems);
  }, [pricingMode]); // Only re-run when pricing mode changes

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    // Find item by barcode
    const item = items.find(
      (i) => i.barcodeNo === barcodeInput.trim() || i.itemCode === barcodeInput.trim()
    );

    if (!item) {
      toast.error(`No item found with barcode: ${barcodeInput}`);
      setBarcodeInput("");
      return;
    }

    // Check if item already exists in invoice
    const existingItemIndex = invoiceItems.findIndex(
      (invItem) => invItem.itemId === item.id
    );

    if (existingItemIndex >= 0) {
      // Increase quantity of existing item
      const updatedItems = [...invoiceItems];
      const existingItem = updatedItems[existingItemIndex];
      const newQuantity = existingItem.quantity + 1;
      
      updatedItems[existingItemIndex] = {
        ...existingItem,
        quantity: newQuantity,
        amount: calculateItemAmount(
          newQuantity,
          existingItem.rate,
          existingItem.gstRate,
          existingItem.cessRate,
          existingItem.discount,
          billingMode
        ),
      };
      
      onItemsChange(updatedItems);
      toast.success(`Updated quantity for ${item.name}`);
    } else {
      // Add new item to invoice
      const rate = getPriceByMode(item);
      const amount = calculateItemAmount(
        1,
        rate,
        item.gstRate,
        item.cessRate,
        0,
        billingMode
      );

      onItemsChange([
        ...invoiceItems,
        {
          itemId: item.id,
          itemName: item.name,
          hsnCode: item.hsnCode,
          quantity: 1,
          unit: item.unit,
          rate,
          gstRate: item.gstRate,
          cessRate: item.cessRate || 0,
          discount: 0,
          amount,
        },
      ]);
      
      toast.success(`Added ${item.name} to invoice`);
    }

    setBarcodeInput("");
    barcodeInputRef.current?.focus();
  };

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
    ]);
  };

  const removeRow = (index: number) => {
    onItemsChange(invoiceItems.filter((_, i) => i !== index));
  };

  const getPriceByMode = (item: IItem): number => {
    switch (pricingMode) {
      case "wholesale":
        return item.wholesalePrice || item.salePrice;
      case "quantity":
        return item.quantityPrice || item.salePrice;
      case "sale":
      default:
        return item.salePrice;
    }
  };

  const updateRow = (
    index: number,
    field: keyof IInvoiceItem,
    value: unknown
  ) => {
    const updatedItems = [...invoiceItems];
    const item = { ...updatedItems[index], [field]: value };

    // Auto-calculate amount
    if (
      ["quantity", "rate", "gstRate", "cessRate", "discount"].includes(field)
    ) {
      item.amount = calculateItemAmount(
        item.quantity,
        item.rate,
        item.gstRate,
        item.cessRate,
        item.discount,
        billingMode
      );
    }

    if (field === "itemId" && value) {
      const selectedItem = items.find((i) => i.id === value);
      if (selectedItem) {
        item.itemName = selectedItem.name;
        item.unit = selectedItem.unit;
        item.rate = getPriceByMode(selectedItem); // Use pricing mode to determine rate
        item.gstRate = selectedItem.gstRate;
        item.cessRate = selectedItem.cessRate;
        item.amount = calculateItemAmount(
          item.quantity,
          getPriceByMode(selectedItem),
          selectedItem.gstRate,
          selectedItem.cessRate,
          item.discount,
          billingMode
        );
      }
    }

    updatedItems[index] = item;
    onItemsChange(updatedItems);
  };

  return (
    <div className="space-y-4">
      {/* Barcode Scanner Input */}
      <form onSubmit={handleBarcodeSubmit} className="flex gap-2 p-4 bg-muted/50 rounded-lg border-2 border-dashed border-primary/20">
        <div className="flex-1 relative">
          <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            ref={barcodeInputRef}
            type="text"
            value={barcodeInput}
            onChange={(e) => setBarcodeInput(e.target.value)}
            placeholder="Scan barcode or enter item code here..."
            className="pl-10 h-10 text-base"
            autoFocus
          />
        </div>
        <Button type="submit" className="gap-2" disabled={!barcodeInput.trim()}>
          <Plus className="w-4 h-4" />
          Add Item
        </Button>
      </form>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-62.5">Item</TableHead>
              <TableHead className="w-25">Quantity</TableHead>
              <TableHead className="w-20">Unit</TableHead>
              <TableHead className="w-30">Rate</TableHead>
              {billingMode === "gst" && (
                <TableHead className="w-20">GST %</TableHead>
              )}
              <TableHead className="w-25">Discount %</TableHead>
              <TableHead className="w-30">Amount</TableHead>
              <TableHead className="w-15"></TableHead>
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
                    onChange={(e) =>
                      updateRow(
                        index,
                        "quantity",
                        Number.parseFloat(e.target.value) || 0
                      )
                    }
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={invoiceItem.unit}
                    disabled
                    className="bg-muted"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    step="0.01"
                    value={invoiceItem.rate}
                    onChange={(e) =>
                      updateRow(
                        index,
                        "rate",
                        Number.parseFloat(e.target.value) || 0
                      )
                    }
                  />
                </TableCell>
                {billingMode === "gst" && (
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      value={invoiceItem.gstRate}
                      onChange={(e) =>
                        updateRow(
                          index,
                          "gstRate",
                          Number.parseFloat(e.target.value) || 0
                        )
                      }
                    />
                  </TableCell>
                )}
                <TableCell>
                  <Input
                    type="number"
                    step="0.01"
                    value={invoiceItem.discount}
                    onChange={(e) =>
                      updateRow(
                        index,
                        "discount",
                        Number.parseFloat(e.target.value) || 0
                      )
                    }
                    placeholder="0"
                  />
                </TableCell>
                <TableCell>
                  <div className="font-medium">
                    ₹{invoiceItem.amount.toFixed(2)}
                  </div>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeRow(index)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Button
        variant="outline"
        onClick={addRow}
        className="gap-2 bg-transparent"
      >
        <Plus className="w-4 h-4" />
        Add Line Item
      </Button>
    </div>
  );
}
