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
import type { IItem, IInvoiceItem, BillingMode, PricingMode, PackingType } from "@/types";
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
  packingType: PackingType; // Added packing type prop
  customField1Enabled?: boolean;
  customField1Label?: string;
  customField2Enabled?: boolean;
  customField2Label?: string;
}

export function InvoiceTable({
  items,
  invoiceItems,
  onItemsChange,
  billingMode,
  pricingMode,
  packingType,
  customField1Enabled,
  customField1Label,
  customField2Enabled,
  customField2Label,
}: InvoiceTableProps) {
  const [barcodeInput, setBarcodeInput] = useState("");
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  
  // Cache for storing loose quantities when switching to carton mode
  const [looseQuantityCache, setLooseQuantityCache] = useState<Record<string, number>>({});

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

  // Handle packing type changes with quantity caching
  useEffect(() => {
    if (invoiceItems.length === 0) return;

    const updatedItems = invoiceItems.map((invoiceItem) => {
      if (!invoiceItem.itemId) return invoiceItem;

      const selectedItem = items.find((i) => i.id === invoiceItem.itemId);
      if (!selectedItem) return invoiceItem;

      let newQuantity = invoiceItem.quantity;

      if (packingType === "carton") {
        // Switching to carton mode - cache loose quantity and convert to cartons
        const perCartonQty = Math.floor(selectedItem.perCartonQuantity || 1);
        
        // Save current loose quantity to cache
        setLooseQuantityCache(prev => ({
          ...prev,
          [invoiceItem.itemId]: Math.floor(invoiceItem.quantity)
        }));

        // Convert to cartons (use per carton quantity)
        newQuantity = perCartonQty;
      } else {
        // Switching to loose mode - restore cached quantity if available
        if (looseQuantityCache[invoiceItem.itemId]) {
          newQuantity = looseQuantityCache[invoiceItem.itemId];
        }
      }

      const newAmount = calculateItemAmount(
        newQuantity,
        invoiceItem.rate,
        invoiceItem.gstRate,
        invoiceItem.cessRate,
        invoiceItem.discount,
        billingMode
      );

      return {
        ...invoiceItem,
        quantity: newQuantity,
        amount: newAmount,
      };
    });

    onItemsChange(updatedItems);
  }, [packingType]); // Only re-run when packing type changes

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
      
      // Determine increment based on packing type (always integer)
      const increment = packingType === "carton" 
        ? Math.floor(item.perCartonQuantity || 1)
        : 1;
      
      const newQuantity = existingItem.quantity + increment;
      
      // Update cache if in loose mode
      if (packingType === "loose") {
        setLooseQuantityCache(prev => ({
          ...prev,
          [item.id]: newQuantity
        }));
      }
      
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
      // Add new item to invoice with initial quantity based on packing type
      const rate = getPriceByMode(item);
      const initialQuantity = packingType === "carton" 
        ? Math.floor(item.perCartonQuantity || 1)
        : 1;
      
      // Cache initial loose quantity
      if (packingType === "loose") {
        setLooseQuantityCache(prev => ({
          ...prev,
          [item.id]: initialQuantity
        }));
      }
      
      const amount = calculateItemAmount(
        initialQuantity,
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
          quantity: initialQuantity,
          unit: item.unit,
          rate,
          gstRate: item.gstRate,
          cessRate: item.cessRate || 0,
          discount: 0,
          amount,
          // Store packaging info for PDF display
          packagingUnit: item.packagingUnit,
          perCartonQuantity: item.perCartonQuantity,
          displayAsPackaging: packingType === "carton",
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

  const updateRow = (
    index: number,
    field: keyof IInvoiceItem,
    value: unknown
  ) => {
    let cacheUpdate: { id: string; qty: number } | null = null;

    const updatedItems = invoiceItems.map((item, i) => {
      if (i !== index) return item;
      const updated = { ...item, [field]: value };

      if (field === "quantity" && packingType === "loose" && updated.itemId) {
        cacheUpdate = { id: updated.itemId, qty: value as number };
      }

      if (
        ["quantity", "rate", "gstRate", "cessRate", "discount"].includes(field)
      ) {
        updated.amount = calculateItemAmount(
          updated.quantity,
          updated.rate,
          updated.gstRate,
          updated.cessRate,
          updated.discount,
          billingMode
        );
      }

      if (field === "itemId" && value) {
        const selectedItem = items.find((si) => si.id === value);
        if (selectedItem) {
          updated.itemName = selectedItem.name;
          updated.unit = selectedItem.unit;
          updated.rate = getPriceByMode(selectedItem);
          updated.gstRate = selectedItem.gstRate;
          updated.cessRate = selectedItem.cessRate;
          updated.packagingUnit = selectedItem.packagingUnit;
          updated.perCartonQuantity = selectedItem.perCartonQuantity;
          updated.displayAsPackaging = packingType === "carton";

          const initialQuantity = packingType === "carton"
            ? Math.floor(selectedItem.perCartonQuantity || 1)
            : 1;
          updated.quantity = initialQuantity;

          if (packingType === "loose") {
            cacheUpdate = { id: selectedItem.id, qty: initialQuantity };
          }

          updated.amount = calculateItemAmount(
            updated.quantity,
            getPriceByMode(selectedItem),
            selectedItem.gstRate,
            selectedItem.cessRate,
            updated.discount,
            billingMode
          );
        }
      }

      return updated;
    });

    if (cacheUpdate) {
      setLooseQuantityCache(prev => ({
        ...prev,
        [cacheUpdate!.id]: cacheUpdate!.qty
      }));
    }

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
              {customField1Enabled && (
                <TableHead className="w-30">{customField1Label}</TableHead>
              )}
              {customField2Enabled && (
                <TableHead className="w-30">{customField2Label}</TableHead>
              )}
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
                 {customField1Enabled && (
                  <TableCell>
                    <Input
                      type="text"
                      value={invoiceItem.customField1Value || ""}
                      onChange={(e) =>
                        updateRow(index, "customField1Value", e.target.value)
                      }
                      placeholder={customField1Label}
                    />
                  </TableCell>
                )}
                {customField2Enabled && (
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      value={invoiceItem.customField2Value || ""}
                      onChange={(e) =>
                        updateRow(
                          index,
                          "customField2Value",
                          e.target.value ? Number.parseFloat(e.target.value) : undefined
                        )
                      }
                      placeholder={customField2Label}
                    />
                  </TableCell>
                )}
                <TableCell>
                  <Input
                    type="number"
                    step={packingType === "carton" 
                      ? (items.find(i => i.id === invoiceItem.itemId)?.perCartonQuantity || 1)
                      : 1}
                    min="0"
                    value={invoiceItem.quantity}
                    onChange={(e) =>
                      updateRow(
                        index,
                        "quantity",
                        Number.parseInt(e.target.value) || 0
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
