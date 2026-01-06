"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { itemSchema, type ItemFormData } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Loader2 } from "lucide-react";
import { createItem, updateItem } from "@/app/items/actions";
import { toast } from "sonner";
import type { IItem } from "@/types";

type GodownOption = {
  id: string;
  name: string;
};

// Generate item code from name
function generateItemCode(name: string): string {
  if (!name) return "";

  // Words to skip (common articles, prepositions, etc.)
  const skipWords = new Set([
    "the",
    "a",
    "an",
    "of",
    "for",
    "and",
    "or",
    "in",
    "on",
    "at",
    "to",
    "cm",
    "mm",
    "m",
    "kg",
    "g",
    "l",
    "ml",
  ]);

  const words = name.trim().split(/\s+/);
  const codeParts: string[] = [];

  for (const word of words) {
    const lowerWord = word.toLowerCase();

    // Skip common words
    if (skipWords.has(lowerWord)) continue;

    // If it's a number, keep it as-is
    if (/^\d+$/.test(word)) {
      codeParts.push(word);
      continue;
    }

    // Remove special characters
    const cleanWord = word.replace(/[^a-zA-Z0-9]/g, "");
    if (!cleanWord) continue;

    // Take first 3-5 characters based on word length
    if (cleanWord.length <= 3) {
      codeParts.push(cleanWord);
    } else if (cleanWord.length <= 6) {
      codeParts.push(cleanWord.slice(0, 4));
    } else {
      codeParts.push(cleanWord.slice(0, 5));
    }
  }

  return codeParts.join("").toUpperCase();
}

interface ItemFormProps {
  item?: IItem;
  godowns?: GodownOption[];
  trigger?: React.ReactNode;
}

export function ItemForm({ item, godowns = [], trigger }: ItemFormProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
    defaultValues: item
      ? {
          itemCode: item.itemCode || "",
          name: item.name,
          description: item.description || "",
          category: item.category || "",
          hsnCode: item.hsnCode || "",
          barcodeNo: item.barcodeNo || "",
          unit: item.unit as ItemFormData["unit"],
          conversionRate: item.conversionRate,
          alternateUnit: item.alternateUnit || "",
          purchasePrice: item.purchasePrice,
          salePrice: item.salePrice,
          wholesalePrice: item.wholesalePrice || 0,
          quantityPrice: item.quantityPrice || 0,
          mrp: item.mrp || 0,
          discountType: item.discountType || "percentage",
          saleDiscount: item.saleDiscount || 0,
          stock: item.stock,
          minStock: item.minStock,
          maxStock: item.maxStock,
          itemLocation: item.itemLocation || "",
          perCartonQuantity: item.perCartonQuantity || undefined,
          godownId: item.godownId ?? null,
          gstRate: item.gstRate,
          taxRate: item.taxRate || item.gstRate,
          cessRate: item.cessRate,
          inclusiveOfTax: item.inclusiveOfTax || false,
        }
      : {
          itemCode: "",
          description: "",
          category: "",
          hsnCode: "",
          conversionRate: 1,
          stock: 0,
          minStock: 0,
          maxStock: 0,
          wholesalePrice: 0,
          quantityPrice: 0,
          discountType: "percentage" as const,
          saleDiscount: 0,
          gstRate: 18,
          taxRate: 18,
          cessRate: 0,
          inclusiveOfTax: true,
          perCartonQuantity: 1,
          godownId: null,
        },
  });

  const selectedUnit = watch("unit");
  const discountType = watch("discountType");
  const inclusiveOfTax = watch("inclusiveOfTax");
  const itemName = watch("name");
  const selectedGodownId = watch("godownId");

  // Auto-generate item code when name changes (only for new items)
  useEffect(() => {
    if (!item && itemName) {
      const generatedCode = generateItemCode(itemName);
      setValue("itemCode", generatedCode);
    }
  }, [itemName, item, setValue]);

  const onSubmit = async (data: ItemFormData) => {
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          formData.append(key, value.toString());
        }
      });

      if (item) {
        await updateItem(item.id, formData);
        toast.success("Item updated successfully");
      } else {
        await createItem(formData);
        toast.success("Item created successfully");
      }

      setOpen(false);
      reset();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save item"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Add Item
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-7xl max-w-[calc(100%-2rem)] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {item ? "Edit Item" : "Add New Item"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="itemCode" className="text-sm font-medium">
                  Item Code / SKU
                </Label>
                <Input
                  id="itemCode"
                  {...register("itemCode")}
                  placeholder="e.g., LAP-001"
                  className="h-9"
                />
                {errors.itemCode && (
                  <p className="text-xs text-destructive">
                    {errors.itemCode.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-sm font-medium">
                  Item Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  {...register("name")}
                  placeholder="Enter item name"
                  className="h-9"
                />
                {errors.name && (
                  <p className="text-xs text-destructive">
                    {errors.name.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-sm font-medium">
                Item Description
              </Label>
              <Input
                id="description"
                {...register("description")}
                placeholder="Detailed description of the item"
                className="h-9"
              />
              {errors.description && (
                <p className="text-xs text-destructive">
                  {errors.description.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="category" className="text-sm font-medium">
                  Category
                </Label>
                <Input
                  id="category"
                  {...register("category")}
                  placeholder="e.g., Electronics, Grocery"
                  className="h-9"
                />
                {errors.category && (
                  <p className="text-xs text-destructive">
                    {errors.category.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="hsnCode" className="text-sm font-medium">
                  HSN Code
                </Label>
                <Input
                  id="hsnCode"
                  {...register("hsnCode")}
                  placeholder="4-8 digits"
                  className="h-9"
                />
                {errors.hsnCode && (
                  <p className="text-xs text-destructive">
                    {errors.hsnCode.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="barcodeNo" className="text-sm font-medium">
                  Barcode Number
                </Label>
                <Input
                  id="barcodeNo"
                  {...register("barcodeNo")}
                  placeholder="Auto-generated or manual"
                  className="h-9"
                />
                {errors.barcodeNo && (
                  <p className="text-xs text-destructive">
                    {errors.barcodeNo.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Unit & Location */}
          <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-primary text-xs">
                📍
              </span>
              Unit & Location
            </h3>
            <div className="grid grid-cols-6 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="unit" className="text-sm font-medium">
                  Unit <span className="text-destructive">*</span>
                </Label>
                <Select
                  onValueChange={(value) =>
                    setValue("unit", value as ItemFormData["unit"])
                  }
                  defaultValue={selectedUnit}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PCS">Pieces (PCS)</SelectItem>
                    <SelectItem value="KG">Kilogram (KG)</SelectItem>
                    <SelectItem value="LTR">Liter (LTR)</SelectItem>
                    <SelectItem value="MTR">Meter (MTR)</SelectItem>
                    <SelectItem value="BOX">Box</SelectItem>
                    <SelectItem value="DOZEN">Dozen</SelectItem>
                    <SelectItem value="PKT">Packet (PKT)</SelectItem>
                    <SelectItem value="BAG">Bag</SelectItem>
                  </SelectContent>
                </Select>
                {errors.unit && (
                  <p className="text-xs text-destructive">
                    {errors.unit.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="conversionRate" className="text-sm font-medium">
                  Conversion Rate
                </Label>
                <Input
                  id="conversionRate"
                  type="number"
                  step="0.01"
                  {...register("conversionRate")}
                  placeholder="1"
                  className="h-9"
                />
                {errors.conversionRate && (
                  <p className="text-xs text-destructive">
                    {errors.conversionRate.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="alternateUnit" className="text-sm font-medium">
                  Alternate Unit
                </Label>
                <Input
                  id="alternateUnit"
                  {...register("alternateUnit")}
                  placeholder="e.g., CTN"
                  className="h-9"
                />
                {errors.alternateUnit && (
                  <p className="text-xs text-destructive">
                    {errors.alternateUnit.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="perCartonQuantity" className="text-sm font-medium">
                  Per Carton Qty
                </Label>
                <Input
                  id="perCartonQuantity"
                  type="number"
                  {...register("perCartonQuantity")}
                  placeholder="e.g., 12"
                  className="h-9"
                />
                {errors.perCartonQuantity && (
                  <p className="text-xs text-destructive">
                    {errors.perCartonQuantity.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Godown</Label>
                <Select
                  value={(selectedGodownId ?? "__none__") as string}
                  onValueChange={(value) => {
                    setValue("godownId", value === "__none__" ? null : value);
                  }}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select godown" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No Godown</SelectItem>
                    {godowns.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.godownId && (
                  <p className="text-xs text-destructive">{errors.godownId.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="itemLocation" className="text-sm font-medium">
                  Item Location
                </Label>
                <Input
                  id="itemLocation"
                  {...register("itemLocation")}
                  placeholder="e.g., Rack A-12"
                  className="h-9"
                />
                {errors.itemLocation && (
                  <p className="text-xs text-destructive">
                    {errors.itemLocation.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="space-y-3 p-5 rounded-lg border bg-linear-to-br from-muted/40 to-muted/20">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-primary text-xs">
                ₹
              </span>
              Pricing
            </h3>
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="purchasePrice">
                  Purchase Price <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="purchasePrice"
                  type="number"
                  step="0.01"
                  {...register("purchasePrice")}
                  placeholder="0.00"
                />
                {errors.purchasePrice && (
                  <p className="text-sm text-destructive">
                    {errors.purchasePrice.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="salePrice">
                  Sale Price (MRP) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="salePrice"
                  type="number"
                  step="0.01"
                  {...register("salePrice")}
                  placeholder="0.00"
                />
                {errors.salePrice && (
                  <p className="text-sm text-destructive">
                    {errors.salePrice.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="wholesalePrice">Wholesale Price</Label>
                <Input
                  id="wholesalePrice"
                  type="number"
                  step="0.01"
                  {...register("wholesalePrice")}
                  placeholder="0.00"
                />
                {errors.wholesalePrice && (
                  <p className="text-sm text-destructive">
                    {errors.wholesalePrice.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantityPrice">Quantity Price (Bulk)</Label>
                <Input
                  id="quantityPrice"
                  type="number"
                  step="0.01"
                  {...register("quantityPrice")}
                  placeholder="0.00"
                />
                {errors.quantityPrice && (
                  <p className="text-sm text-destructive">
                    {errors.quantityPrice.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mrp">MRP</Label>
                <Input
                  id="mrp"
                  type="number"
                  step="0.01"
                  {...register("mrp")}
                  placeholder="0.00"
                />
                {errors.mrp && (
                  <p className="text-sm text-destructive">
                    {errors.mrp.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="discountType">Discount Type</Label>
                <Select
                  onValueChange={(value) =>
                    setValue("discountType", value as "percentage" | "flat")
                  }
                  defaultValue={discountType}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="flat">Flat Amount (₹)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="saleDiscount">Sale Discount</Label>
                <Input
                  id="saleDiscount"
                  type="number"
                  step="0.01"
                  {...register("saleDiscount")}
                  placeholder="0"
                />
                {errors.saleDiscount && (
                  <p className="text-sm text-destructive">
                    {errors.saleDiscount.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Stock Management */}
          <div className="space-y-3 p-5 rounded-lg border bg-linear-to-br from-muted/40 to-muted/20">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-primary text-xs">
                📦
              </span>
              Stock Management
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="stock" className="text-sm font-medium">
                  Current Stock
                </Label>
                <Input
                  id="stock"
                  type="number"
                  {...register("stock")}
                  placeholder="0"
                  className="h-9"
                />
                {errors.stock && (
                  <p className="text-xs text-destructive">
                    {errors.stock.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="minStock" className="text-sm font-medium">
                  Min Stock (Alert Threshold)
                </Label>
                <Input
                  id="minStock"
                  type="number"
                  {...register("minStock")}
                  placeholder="0"
                  className="h-9"
                />
                {errors.minStock && (
                  <p className="text-xs text-destructive">
                    {errors.minStock.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="maxStock" className="text-sm font-medium">
                  Max Stock
                </Label>
                <Input
                  id="maxStock"
                  type="number"
                  {...register("maxStock")}
                  placeholder="0"
                  className="h-9"
                />
                {errors.maxStock && (
                  <p className="text-xs text-destructive">
                    {errors.maxStock.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Tax Configuration */}
          <div className="space-y-3 p-5 rounded-lg border bg-linear-to-br from-muted/40 to-muted/20">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-primary text-xs">
                %
              </span>
              Tax Configuration
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="gstRate" className="text-sm font-medium">
                  GST Rate (%) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="gstRate"
                  type="number"
                  step="0.01"
                  {...register("gstRate")}
                  placeholder="18"
                  className="h-9"
                />
                {errors.gstRate && (
                  <p className="text-xs text-destructive">
                    {errors.gstRate.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="taxRate" className="text-sm font-medium">
                  Tax Rate (%)
                </Label>
                <Input
                  id="taxRate"
                  type="number"
                  step="0.01"
                  {...register("taxRate")}
                  placeholder="18"
                  className="h-9"
                />
                {errors.taxRate && (
                  <p className="text-xs text-destructive">
                    {errors.taxRate.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cessRate" className="text-sm font-medium">
                  Cess Rate (%)
                </Label>
                <Input
                  id="cessRate"
                  type="number"
                  step="0.01"
                  {...register("cessRate")}
                  placeholder="0"
                  className="h-9"
                />
                {errors.cessRate && (
                  <p className="text-xs text-destructive">
                    {errors.cessRate.message}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="inclusiveOfTax"
                checked={inclusiveOfTax}
                onCheckedChange={(checked) =>
                  setValue("inclusiveOfTax", checked as boolean)
                }
              />
              <Label
                htmlFor="inclusiveOfTax"
                className="text-sm font-normal cursor-pointer"
              >
                Price is inclusive of tax
              </Label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
              className="min-w-24"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="min-w-32">
              {isSubmitting && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {item ? "Update Item" : "Create Item"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
