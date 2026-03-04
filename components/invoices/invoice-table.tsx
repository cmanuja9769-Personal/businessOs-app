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
import type { IItem, IInvoiceItem, BillingMode, PricingMode, PackingType, PackagingUnit } from "@/types";
import type { LightweightItem } from "@/app/items/lightweight-actions";
import { calculateItemAmount } from "@/lib/invoice-calculations";
import { useEffect, useRef, useState, useCallback } from "react";
import { AsyncItemSelect } from "@/components/items/async-item-select";
import { searchItemsForInvoice } from "@/app/items/lightweight-actions";
import { toast } from "sonner";

type InvoiceItem = IItem | LightweightItem;

const AMOUNT_FIELDS = new Set<string>(["quantity", "rate", "gstRate", "cessRate", "discount"]);

function getPriceByMode(item: InvoiceItem, mode: PricingMode): number {
  switch (mode) {
    case "wholesale":
      return item.wholesalePrice || item.salePrice;
    case "quantity":
      return item.quantityPrice || item.salePrice;
    case "sale":
    default:
      return item.salePrice;
  }
}

function getPackingQuantity(packingType: PackingType, perCartonQuantity: number | undefined | null): number {
  if (packingType === "carton") return Math.floor(perCartonQuantity || 1);
  return 1;
}

function recalculateAmount(item: IInvoiceItem, billingMode: BillingMode): number {
  return calculateItemAmount(
    item.quantity,
    item.rate,
    item.gstRate,
    item.cessRate,
    item.discount,
    billingMode
  );
}

function buildNewInvoiceItem(
  item: InvoiceItem,
  rate: number,
  quantity: number,
  billingMode: BillingMode,
  packingType: PackingType
): IInvoiceItem {
  return {
    itemId: item.id,
    itemName: item.name,
    hsnCode: item.hsnCode,
    quantity,
    unit: item.unit,
    rate,
    gstRate: item.gstRate,
    cessRate: item.cessRate || 0,
    discount: 0,
    amount: calculateItemAmount(quantity, rate, item.gstRate, item.cessRate, 0, billingMode),
    packagingUnit: item.packagingUnit as PackagingUnit | undefined,
    perCartonQuantity: item.perCartonQuantity,
    displayAsPackaging: packingType === "carton",
  };
}

function applyItemSelection(
  updated: IInvoiceItem,
  selectedItem: InvoiceItem,
  rate: number,
  packingType: PackingType,
  billingMode: BillingMode
): IInvoiceItem {
  const quantity = getPackingQuantity(packingType, selectedItem.perCartonQuantity);
  return {
    ...updated,
    itemName: selectedItem.name,
    unit: selectedItem.unit,
    rate,
    gstRate: selectedItem.gstRate,
    cessRate: selectedItem.cessRate,
    packagingUnit: (selectedItem.packagingUnit ?? undefined) as PackagingUnit | undefined,
    perCartonQuantity: selectedItem.perCartonQuantity,
    displayAsPackaging: packingType === "carton",
    quantity,
    amount: calculateItemAmount(quantity, rate, selectedItem.gstRate, selectedItem.cessRate, updated.discount, billingMode),
  };
}

function processRowUpdate(
  item: IInvoiceItem,
  field: keyof IInvoiceItem,
  value: unknown,
  allItems: InvoiceItem[],
  billingMode: BillingMode,
  pricingMode: PricingMode,
  packingType: PackingType
): { updated: IInvoiceItem; cacheUpdate: { id: string; qty: number } | null } {
  const updated = { ...item, [field]: value };
  let cacheUpdate: { id: string; qty: number } | null = null;

  if (field === "quantity" && packingType === "loose" && updated.itemId) {
    cacheUpdate = { id: updated.itemId, qty: value as number };
  }

  if (AMOUNT_FIELDS.has(field as string)) {
    updated.amount = recalculateAmount(updated, billingMode);
  }

  if (field !== "itemId" || !value) return { updated, cacheUpdate };

  const selectedItem = allItems.find((si) => si.id === value);
  if (!selectedItem) return { updated, cacheUpdate };

  const rate = getPriceByMode(selectedItem, pricingMode);
  const applied = applyItemSelection(updated, selectedItem, rate, packingType, billingMode);
  if (packingType === "loose") {
    cacheUpdate = { id: selectedItem.id, qty: applied.quantity };
  }

  return { updated: applied, cacheUpdate };
}

interface InvoiceTableProps {
  items: InvoiceItem[];
  invoiceItems: IInvoiceItem[];
  onItemsChange: (items: IInvoiceItem[]) => void;
  onItemsPoolChange?: (items: InvoiceItem[]) => void;
  billingMode: BillingMode;
  pricingMode: PricingMode;
  packingType: PackingType;
  customField1Enabled?: boolean;
  customField1Label?: string;
  customField2Enabled?: boolean;
  customField2Label?: string;
}

export function InvoiceTable({
  items,
  invoiceItems,
  onItemsChange,
  onItemsPoolChange,
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
  
  const looseQuantityCacheRef = useRef<Record<string, number>>({});

  const prevPricingModeRef = useRef(pricingMode);
  useEffect(() => {
    if (prevPricingModeRef.current === pricingMode) return;
    prevPricingModeRef.current = pricingMode;
    if (invoiceItems.length === 0) return;

    const updatedItems = invoiceItems.map((invoiceItem) => {
      if (!invoiceItem.itemId) return invoiceItem;

      const selectedItem = items.find((i) => i.id === invoiceItem.itemId);
      if (!selectedItem) return invoiceItem;

      const newRate = getPriceByMode(selectedItem, pricingMode);
      if (newRate === invoiceItem.rate) return invoiceItem;

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
  }, [pricingMode, invoiceItems, items, billingMode, onItemsChange]);

  const prevPackingTypeRef = useRef(packingType);
  useEffect(() => {
    if (prevPackingTypeRef.current === packingType) return;
    prevPackingTypeRef.current = packingType;
    if (invoiceItems.length === 0) return;

    const cache = looseQuantityCacheRef.current;
    const updatedItems = invoiceItems.map((invoiceItem) => {
      if (!invoiceItem.itemId) return invoiceItem;

      const selectedItem = items.find((i) => i.id === invoiceItem.itemId);
      if (!selectedItem) return invoiceItem;

      let newQuantity = invoiceItem.quantity;

      if (packingType === "carton") {
        const perCartonQty = Math.floor(selectedItem.perCartonQuantity || 1);
        cache[invoiceItem.itemId] = Math.floor(invoiceItem.quantity);
        newQuantity = perCartonQty;
      } else {
        if (cache[invoiceItem.itemId]) {
          newQuantity = cache[invoiceItem.itemId];
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
  }, [packingType, invoiceItems, items, billingMode, onItemsChange]);

  const updateExistingBarcodeItem = (item: InvoiceItem, existingItemIndex: number) => {
    const updatedItems = [...invoiceItems];
    const existingItem = updatedItems[existingItemIndex];
    const increment = getPackingQuantity(packingType, item.perCartonQuantity);
    const newQuantity = existingItem.quantity + increment;

    if (packingType === "loose") {
      looseQuantityCacheRef.current[item.id] = newQuantity;
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
  };

  const addNewBarcodeItem = (item: InvoiceItem) => {
    const rate = getPriceByMode(item, pricingMode);
    const initialQuantity = getPackingQuantity(packingType, item.perCartonQuantity);

    if (packingType === "loose") {
      looseQuantityCacheRef.current[item.id] = initialQuantity;
    }

    const newItem = buildNewInvoiceItem(item, rate, initialQuantity, billingMode, packingType);
    onItemsChange([...invoiceItems, newItem]);
    toast.success(`Added ${item.name} to invoice`);
  };

  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    let item = items.find(
      (i) => i.barcodeNo === barcodeInput.trim() || i.itemCode === barcodeInput.trim()
    );

    if (!item) {
      const serverResults = await searchItemsForInvoice(barcodeInput.trim(), 1);
      if (serverResults.length > 0) {
        const found = serverResults[0];
        if (found.barcodeNo === barcodeInput.trim() || found.itemCode === barcodeInput.trim()) {
          item = found;
          onItemsPoolChange?.([...items, found]);
        }
      }
    }

    if (!item) {
      toast.error(`No item found with barcode: ${barcodeInput}`);
      setBarcodeInput("");
      return;
    }

    const existingItemIndex = invoiceItems.findIndex(
      (invItem) => invItem.itemId === item.id
    );

    if (existingItemIndex >= 0) {
      updateExistingBarcodeItem(item, existingItemIndex);
    } else {
      addNewBarcodeItem(item);
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
      const result = processRowUpdate(item, field, value, items, billingMode, pricingMode, packingType);
      if (result.cacheUpdate) cacheUpdate = result.cacheUpdate;
      return result.updated;
    });

    if (cacheUpdate) {
      const resolved = cacheUpdate as { id: string; qty: number };
      looseQuantityCacheRef.current[resolved.id] = resolved.qty;
    }

    onItemsChange(updatedItems);
  };

  const handleItemsFetched = useCallback((fetched: InvoiceItem[]) => {
    if (onItemsPoolChange) {
      const existingIds = new Set(items.map((i) => i.id));
      const newItems = fetched.filter((i) => !existingIds.has(i.id));
      if (newItems.length > 0) {
        onItemsPoolChange([...items, ...newItems]);
      }
    }
  }, [items, onItemsPoolChange]);

  return (
    <div className="space-y-4">
      <form onSubmit={handleBarcodeSubmit} className="flex gap-2 p-2 sm:p-4 bg-muted/50 rounded-lg border-2 border-dashed border-primary/20">
        <div className="flex-1 relative">
          <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            ref={barcodeInputRef}
            type="text"
            value={barcodeInput}
            onChange={(e) => setBarcodeInput(e.target.value)}
            placeholder="Scan barcode or enter item code..."
            className="pl-10 h-9 sm:h-10 text-sm sm:text-base"
          />
        </div>
        <Button type="submit" className="gap-2 h-9 sm:h-10 px-2 sm:px-4" disabled={!barcodeInput.trim()}>
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Item</span>
        </Button>
      </form>

      <div className="overflow-x-auto -mx-2 sm:-mx-4">
        <div className="min-w-[28rem] sm:min-w-[50rem] px-2 sm:px-4">
        <Table containerClassName="overflow-visible border-0">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[8rem] sm:w-[15rem]">Item</TableHead>
              {customField1Enabled && (
                <TableHead className="w-28">{customField1Label}</TableHead>
              )}
              {customField2Enabled && (
                <TableHead className="w-28">{customField2Label}</TableHead>
              )}
              <TableHead className="w-24">Quantity</TableHead>
              <TableHead className="hidden sm:table-cell w-20">Unit</TableHead>
              <TableHead className="w-20 sm:w-28">Rate</TableHead>
              {billingMode === "gst" && (
                <TableHead className="hidden sm:table-cell w-20">GST %</TableHead>
              )}
              <TableHead className="w-16 sm:w-24">Discount %</TableHead>
              <TableHead className="w-20 sm:w-28">Amount</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoiceItems.map((invoiceItem, index) => (
              <TableRow key={index}>
                <TableCell>
                  <AsyncItemSelect
                    items={items}
                    value={invoiceItem.itemId}
                    onValueChange={(value) => updateRow(index, "itemId", value)}
                    placeholder="Select item"
                    onItemsFetched={handleItemsFetched}
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
                <TableCell className="hidden sm:table-cell">
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
                  <TableCell className="hidden sm:table-cell">
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
