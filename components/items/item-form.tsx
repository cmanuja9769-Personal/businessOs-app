"use client";

import type React from "react";
import { useState, useEffect, useMemo, useCallback } from "react";
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
  DialogBody,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Loader2, Package, Info, Check, ChevronsUpDown, Search } from "lucide-react";
import { createItem, updateItem, getItemCategories } from "@/app/items/actions";
import { toast } from "sonner";
import type { IItem } from "@/types";
import { PACKAGING_UNITS, BASE_UNITS } from "@/types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { searchHSNCodes, type HSNCode } from "@/lib/hsn-codes";

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
  
  // Category combobox state
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [categorySearch, setCategorySearch] = useState("");
  
  // HSN code combobox state
  const [hsnOpen, setHsnOpen] = useState(false);
  const [hsnSearch, setHsnSearch] = useState("");
  const [hsnSuggestions, setHsnSuggestions] = useState<HSNCode[]>([]);

  // Find default warehouse "E" or first available
  const defaultGodownId = useMemo(() => {
    if (!godowns || godowns.length === 0) return null;
    const eWarehouse = godowns.find(g => g.name === "E");
    return eWarehouse?.id || godowns[0]?.id || null;
  }, [godowns]);

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
          packagingUnit: item.packagingUnit || "CTN",
          purchasePrice: item.purchasePrice,
          salePrice: item.salePrice,
          wholesalePrice: item.wholesalePrice || 0,
          quantityPrice: item.quantityPrice || 0,
          mrp: item.mrp || 0,
          discountType: item.discountType || "percentage",
          saleDiscount: item.saleDiscount || 0,
          stock: item.stock, // Stock is in packaging units (CTN, BAG, etc.)
          minStock: item.minStock,
          maxStock: item.maxStock,
          itemLocation: item.itemLocation || "",
          perCartonQuantity: item.perCartonQuantity || 1,
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
          packagingUnit: "CTN",
          stock: 0, // Stock is in packaging units
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
          godownId: defaultGodownId,  // Default to "E" warehouse or first available
        },
  });

  const selectedUnit = watch("unit");
  const discountType = watch("discountType");
  const inclusiveOfTax = watch("inclusiveOfTax");
  const itemName = watch("name");
  const selectedGodownId = watch("godownId");
  const packagingUnit = watch("packagingUnit");
  const perCartonQuantity = watch("perCartonQuantity");
  const enteredStock = watch("stock");
  const selectedCategory = watch("category");
  const selectedHsnCode = watch("hsnCode");

  // Load categories from database when dialog opens
  useEffect(() => {
    if (open) {
      getItemCategories().then(setCategories).catch(() => setCategories([]));
    }
  }, [open]);

  // Update HSN suggestions when search changes
  useEffect(() => {
    const results = searchHSNCodes(hsnSearch, 15);
    setHsnSuggestions(results);
  }, [hsnSearch]);

  // Filter categories based on search
  const filteredCategories = useMemo(() => {
    if (!categorySearch) return categories;
    const search = categorySearch.toLowerCase();
    return categories.filter(cat => cat.toLowerCase().includes(search));
  }, [categories, categorySearch]);

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
      
      // Stock is stored directly in packaging units (CTN, BAG, etc.)
      // No conversion needed - what user enters is what gets stored
      
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
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-4xl lg:max-w-6xl xl:max-w-7xl p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {item ? "Edit Item" : "Add New Item"}
          </DialogTitle>
        </DialogHeader>
        <DialogBody>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
          {/* Basic Information */}
          <div className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="category" className="text-sm font-medium">
                  Category
                </Label>
                <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={categoryOpen}
                      className="w-full h-9 justify-between font-normal"
                    >
                      {selectedCategory || "Select or type category..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[250px] p-0" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput 
                        placeholder="Search or add category..." 
                        value={categorySearch}
                        onValueChange={setCategorySearch}
                      />
                      <CommandList>
                        <CommandEmpty>
                          {categorySearch ? (
                            <div className="py-2 px-2">
                              <Button
                                variant="ghost"
                                className="w-full justify-start text-sm"
                                onClick={() => {
                                  setValue("category", categorySearch);
                                  setCategoryOpen(false);
                                  setCategorySearch("");
                                }}
                              >
                                <Plus className="mr-2 h-4 w-4" />
                                Add "{categorySearch}"
                              </Button>
                            </div>
                          ) : (
                            "No categories found."
                          )}
                        </CommandEmpty>
                        <CommandGroup>
                          {filteredCategories.map((cat) => (
                            <CommandItem
                              key={cat}
                              value={cat}
                              onSelect={() => {
                                setValue("category", cat);
                                setCategoryOpen(false);
                                setCategorySearch("");
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedCategory === cat ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {cat}
                            </CommandItem>
                          ))}
                          {categorySearch && !filteredCategories.includes(categorySearch) && (
                            <CommandItem
                              value={categorySearch}
                              onSelect={() => {
                                setValue("category", categorySearch);
                                setCategoryOpen(false);
                                setCategorySearch("");
                              }}
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              Add "{categorySearch}"
                            </CommandItem>
                          )}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
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
                <Popover open={hsnOpen} onOpenChange={setHsnOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={hsnOpen}
                      className="w-full h-9 justify-between font-normal"
                    >
                      {selectedHsnCode || "Search HSN codes..."}
                      <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[350px] p-0" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput 
                        placeholder="Search by code or description..." 
                        value={hsnSearch}
                        onValueChange={setHsnSearch}
                      />
                      <CommandList>
                        <CommandEmpty>
                          {hsnSearch ? (
                            <div className="py-2 px-2">
                              <Button
                                variant="ghost"
                                className="w-full justify-start text-sm"
                                onClick={() => {
                                  setValue("hsnCode", hsnSearch);
                                  setHsnOpen(false);
                                  setHsnSearch("");
                                }}
                              >
                                <Plus className="mr-2 h-4 w-4" />
                                Use "{hsnSearch}"
                              </Button>
                            </div>
                          ) : (
                            "Type to search HSN codes..."
                          )}
                        </CommandEmpty>
                        <CommandGroup heading="Suggested HSN Codes">
                          {hsnSuggestions.map((hsn) => (
                            <CommandItem
                              key={hsn.code}
                              value={hsn.code}
                              onSelect={() => {
                                setValue("hsnCode", hsn.code);
                                // Auto-fill GST rate if available
                                if (hsn.gstRate !== undefined) {
                                  setValue("gstRate", hsn.gstRate);
                                  setValue("taxRate", hsn.gstRate);
                                }
                                setHsnOpen(false);
                                setHsnSearch("");
                              }}
                              className="flex flex-col items-start py-2"
                            >
                              <div className="flex items-center w-full">
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4 shrink-0",
                                    selectedHsnCode === hsn.code ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <span className="font-mono font-medium">{hsn.code}</span>
                                {hsn.gstRate !== undefined && (
                                  <span className="ml-auto text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                    {hsn.gstRate}% GST
                                  </span>
                                )}
                              </div>
                              <span className="ml-6 text-xs text-muted-foreground line-clamp-1">
                                {hsn.description}
                              </span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
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

          {/* Unit & Packaging Configuration */}
          <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-primary text-xs">
                <Package className="w-3 h-3" />
              </span>
              Unit & Packaging
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Configure base unit (e.g., PCS) and packaging unit (e.g., CTN). Set how many base units make up one packaging unit.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </h3>
            
            {/* Base Unit Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="unit" className="text-sm font-medium">
                  Base Unit <span className="text-destructive">*</span>
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
                    {BASE_UNITS.map((u) => (
                      <SelectItem key={u.value} value={u.value}>
                        {u.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.unit && (
                  <p className="text-xs text-destructive">
                    {errors.unit.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="packagingUnit" className="text-sm font-medium">
                  Packaging Unit
                </Label>
                <Select
                  onValueChange={(value) => setValue("packagingUnit", value)}
                  defaultValue={packagingUnit || "CTN"}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select packaging" />
                  </SelectTrigger>
                  <SelectContent>
                    {PACKAGING_UNITS.map((u) => (
                      <SelectItem key={u.value} value={u.value}>
                        {u.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="perCartonQuantity" className="text-sm font-medium flex items-center gap-1">
                  Per {packagingUnit || "CTN"} Qty
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-3 h-3 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>How many {selectedUnit || "PCS"} in one {packagingUnit || "CTN"}?</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <Input
                  id="perCartonQuantity"
                  type="number"
                  min="1"
                  {...register("perCartonQuantity")}
                  placeholder="e.g., 12, 24, 1500"
                  className="h-9"
                />
                {errors.perCartonQuantity && (
                  <p className="text-xs text-destructive">
                    {errors.perCartonQuantity.message}
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
            </div>

            {/* Packaging Summary */}
            {perCartonQuantity && perCartonQuantity > 1 && (
              <div className="text-xs text-muted-foreground bg-primary/5 p-2 rounded-md border border-primary/10">
                <span className="font-medium text-primary">Packaging:</span> 1 {packagingUnit || "CTN"} = {perCartonQuantity} {selectedUnit || "PCS"}
              </div>
            )}

            {/* Location Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="alternateUnit" className="text-sm font-medium">
                  Alternate Unit
                </Label>
                <Select
                  value={watch("alternateUnit") || "__none__"}
                  onValueChange={(value) => setValue("alternateUnit", value === "__none__" ? "" : value)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {BASE_UNITS.filter(u => u.value !== selectedUnit).map((u) => (
                      <SelectItem key={u.value} value={u.value}>
                        {u.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.alternateUnit && (
                  <p className="text-xs text-destructive">
                    {errors.alternateUnit.message}
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
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
              <span className="ml-auto text-xs font-normal text-muted-foreground">
                Stock is maintained in {packagingUnit || "CTN"}
              </span>
            </h3>
            
            {/* Opening Stock - Always in Packaging Units */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="stock" className="text-sm font-medium">
                  Opening/Current Stock
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="stock"
                    type="number"
                    {...register("stock")}
                    placeholder="0"
                    className="h-9 flex-1"
                  />
                  <div className="h-9 px-3 flex items-center justify-center border rounded-md bg-muted text-muted-foreground min-w-[80px]">
                    {packagingUnit || "CTN"}
                  </div>
                </div>
                {errors.stock && (
                  <p className="text-xs text-destructive">
                    {errors.stock.message}
                  </p>
                )}
                {/* Show conversion to base units */}
                {perCartonQuantity && perCartonQuantity > 1 && enteredStock ? (
                  <p className="text-xs text-muted-foreground mt-1">
                    = <span className="font-medium text-primary">{(enteredStock * perCartonQuantity).toLocaleString()}</span> {selectedUnit || "PCS"} ({enteredStock} × {perCartonQuantity})
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="minStock" className="text-sm font-medium">
                  Min Stock ({packagingUnit || "CTN"})
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
                  Max Stock ({packagingUnit || "CTN"})
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
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
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
