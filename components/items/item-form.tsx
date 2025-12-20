"use client"

import type React from "react"
import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { itemSchema, type ItemFormData } from "@/lib/schemas"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Loader2 } from "lucide-react"
import { createItem, updateItem } from "@/app/items/actions"
import { toast } from "sonner"
import type { IItem } from "@/types"

interface ItemFormProps {
  item?: IItem
  trigger?: React.ReactNode
}

export function ItemForm({ item, trigger }: ItemFormProps) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

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
          category: item.category || "",
          hsnCode: item.hsnCode || "",
          barcodeNo: item.barcodeNo || "",
          unit: item.unit,
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
          gstRate: item.gstRate,
          taxRate: item.taxRate || item.gstRate,
          cessRate: item.cessRate,
          inclusiveOfTax: item.inclusiveOfTax || false,
        }
      : {
          itemCode: "",
          category: "",
          hsnCode: "",
          conversionRate: 1,
          stock: 0,
          minStock: 0,
          maxStock: 0,
          wholesalePrice: 0,
          quantityPrice: 0,
          discountType: "percentage",
          saleDiscount: 0,
          gstRate: 18,
          taxRate: 18,
          cessRate: 0,
          inclusiveOfTax: false,
        },
  })

  const selectedUnit = watch("unit")
  const discountType = watch("discountType")
  const inclusiveOfTax = watch("inclusiveOfTax")

  const onSubmit = async (data: ItemFormData) => {
    setIsSubmitting(true)
    try {
      const formData = new FormData()
      Object.entries(data).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          formData.append(key, value.toString())
        }
      })

      if (item) {
        await updateItem(item.id, formData)
        toast.success("Item updated successfully")
      } else {
        await createItem(formData)
        toast.success("Item created successfully")
      }

      setOpen(false)
      reset()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save item")
    } finally {
      setIsSubmitting(false)
    }
  }

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
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? "Edit Item" : "Add New Item"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="itemCode">Item Code / SKU</Label>
              <Input id="itemCode" {...register("itemCode")} placeholder="e.g., LAP-001" />
              {errors.itemCode && <p className="text-sm text-destructive">{errors.itemCode.message}</p>}
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="name">
                Item Name <span className="text-destructive">*</span>
              </Label>
              <Input id="name" {...register("name")} placeholder="Enter item name" />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input id="category" {...register("category")} placeholder="e.g., Electronics, Grocery" />
              {errors.category && <p className="text-sm text-destructive">{errors.category.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="hsnCode">HSN Code</Label>
              <Input id="hsnCode" {...register("hsnCode")} placeholder="4-8 digits" />
              {errors.hsnCode && <p className="text-sm text-destructive">{errors.hsnCode.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="barcodeNo">Barcode Number</Label>
              <Input id="barcodeNo" {...register("barcodeNo")} placeholder="Auto-generated or manual" />
              {errors.barcodeNo && <p className="text-sm text-destructive">{errors.barcodeNo.message}</p>}
            </div>
          </div>

          {/* Unit section remains the same */}
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="unit">
                Unit <span className="text-destructive">*</span>
              </Label>
              <Select
                onValueChange={(value) => setValue("unit", value as ItemFormData["unit"])}
                defaultValue={selectedUnit}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PCS">Pieces (PCS)</SelectItem>
                  <SelectItem value="KG">Kilogram (KG)</SelectItem>
                  <SelectItem value="LTR">Liter (LTR)</SelectItem>
                  <SelectItem value="MTR">Meter (MTR)</SelectItem>
                  <SelectItem value="BOX">Box</SelectItem>
                  <SelectItem value="DOZEN">Dozen</SelectItem>
                </SelectContent>
              </Select>
              {errors.unit && <p className="text-sm text-destructive">{errors.unit.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="conversionRate">Conversion Rate</Label>
              <Input id="conversionRate" type="number" step="0.01" {...register("conversionRate")} placeholder="1" />
              {errors.conversionRate && <p className="text-sm text-destructive">{errors.conversionRate.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="alternateUnit">Alternate Unit</Label>
              <Input id="alternateUnit" {...register("alternateUnit")} placeholder="e.g., CTN" />
              {errors.alternateUnit && <p className="text-sm text-destructive">{errors.alternateUnit.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="itemLocation">Item Location</Label>
              <Input id="itemLocation" {...register("itemLocation")} placeholder="e.g., Rack A-12" />
              {errors.itemLocation && <p className="text-sm text-destructive">{errors.itemLocation.message}</p>}
            </div>
          </div>

          <div className="space-y-3 p-4 border rounded-lg">
            <h3 className="font-medium text-sm text-muted-foreground">Pricing</h3>
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="purchasePrice">
                  Purchase Price <span className="text-destructive">*</span>
                </Label>
                <Input id="purchasePrice" type="number" step="0.01" {...register("purchasePrice")} placeholder="0.00" />
                {errors.purchasePrice && <p className="text-sm text-destructive">{errors.purchasePrice.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="salePrice">
                  Sale Price (MRP) <span className="text-destructive">*</span>
                </Label>
                <Input id="salePrice" type="number" step="0.01" {...register("salePrice")} placeholder="0.00" />
                {errors.salePrice && <p className="text-sm text-destructive">{errors.salePrice.message}</p>}
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
                {errors.wholesalePrice && <p className="text-sm text-destructive">{errors.wholesalePrice.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantityPrice">Quantity Price (Bulk)</Label>
                <Input id="quantityPrice" type="number" step="0.01" {...register("quantityPrice")} placeholder="0.00" />
                {errors.quantityPrice && <p className="text-sm text-destructive">{errors.quantityPrice.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mrp">MRP</Label>
                <Input id="mrp" type="number" step="0.01" {...register("mrp")} placeholder="0.00" />
                {errors.mrp && <p className="text-sm text-destructive">{errors.mrp.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="discountType">Discount Type</Label>
                <Select
                  onValueChange={(value) => setValue("discountType", value as "percentage" | "flat")}
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
                <Input id="saleDiscount" type="number" step="0.01" {...register("saleDiscount")} placeholder="0.00" />
                {errors.saleDiscount && <p className="text-sm text-destructive">{errors.saleDiscount.message}</p>}
              </div>
            </div>
          </div>

          {/* Stock section */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stock">Current Stock</Label>
              <Input id="stock" type="number" {...register("stock")} placeholder="0" />
              {errors.stock && <p className="text-sm text-destructive">{errors.stock.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="minStock">Min Stock (Alert Threshold)</Label>
              <Input id="minStock" type="number" {...register("minStock")} placeholder="0" />
              {errors.minStock && <p className="text-sm text-destructive">{errors.minStock.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxStock">Max Stock</Label>
              <Input id="maxStock" type="number" {...register("maxStock")} placeholder="0" />
              {errors.maxStock && <p className="text-sm text-destructive">{errors.maxStock.message}</p>}
            </div>
          </div>

          <div className="space-y-3 p-4 border rounded-lg">
            <h3 className="font-medium text-sm text-muted-foreground">Tax Configuration</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gstRate">
                  GST Rate (%) <span className="text-destructive">*</span>
                </Label>
                <Input id="gstRate" type="number" step="0.01" {...register("gstRate")} placeholder="18" />
                {errors.gstRate && <p className="text-sm text-destructive">{errors.gstRate.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="taxRate">Tax Rate (%)</Label>
                <Input id="taxRate" type="number" step="0.01" {...register("taxRate")} placeholder="18" />
                {errors.taxRate && <p className="text-sm text-destructive">{errors.taxRate.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="cessRate">Cess Rate (%)</Label>
                <Input id="cessRate" type="number" step="0.01" {...register("cessRate")} placeholder="0" />
                {errors.cessRate && <p className="text-sm text-destructive">{errors.cessRate.message}</p>}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="inclusiveOfTax"
                checked={inclusiveOfTax}
                onCheckedChange={(checked) => setValue("inclusiveOfTax", checked as boolean)}
              />
              <Label htmlFor="inclusiveOfTax" className="font-normal cursor-pointer">
                Price is inclusive of tax
              </Label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {item ? "Update" : "Create"} Item
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
