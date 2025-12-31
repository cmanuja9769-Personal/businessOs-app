"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Upload, Download, AlertCircle, Loader2, Trash2, Plus, Check } from "lucide-react"
import { parseExcelFile, downloadItemExcelTemplate } from "@/lib/excel-parser"
import { itemSchema } from "@/lib/schemas"
import { bulkImportItems } from "@/app/items/actions"
import { toast } from "sonner"
import type { IItem } from "@/types"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type UploadStep = "upload" | "confirm"

interface ParsedItemRow {
  data: Partial<IItem>
  errors: string[]
  isValid: boolean
}

export function ItemUploadBtn({ godowns }: { godowns: Array<{ id: string; name: string }> }) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<UploadStep>("upload")
  const [isProcessing, setIsProcessing] = useState(false)
  const [parsedData, setParsedData] = useState<ParsedItemRow[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validUnits: Array<"PCS" | "KG" | "LTR" | "MTR" | "BOX" | "DOZEN"> = ["PCS", "KG", "LTR", "MTR", "BOX", "DOZEN"]

  const updateRow = (index: number, field: keyof IItem, value: string | number) => {
    setParsedData((prev) => {
      const newData = [...prev]
      newData[index].data = { ...newData[index].data, [field]: value }

      // Revalidate the row
      try {
        const unitValue = String(newData[index].data.unit || "")
          .toUpperCase()
          .trim()
        if (!validUnits.includes(unitValue as any)) {
          throw new Error(`Invalid unit "${newData[index].data.unit}". Must be one of: ${validUnits.join(", ")}`)
        }

        const inclusiveOfTax = String(newData[index].data.inclusiveOfTax || "false").toLowerCase() === "true" ||
          String(newData[index].data.inclusiveOfTax || "").toLowerCase() === "yes"

        itemSchema.parse({
          itemCode: newData[index].data.itemCode?.toString() || "",
          name: newData[index].data.name,
          category: newData[index].data.category?.toString() || "",
          hsnCode: newData[index].data.hsnCode?.toString() || "",
          barcodeNo: newData[index].data.barcodeNo?.toString() || "",
          unit: unitValue as "PCS" | "KG" | "LTR" | "MTR" | "BOX" | "DOZEN",
          conversionRate: Number(newData[index].data.conversionRate) || 1,
          alternateUnit: newData[index].data.alternateUnit?.toString() || "",
          purchasePrice: Number(newData[index].data.purchasePrice) || 0,
          salePrice: Number(newData[index].data.salePrice) || 0,
          wholesalePrice: Number(newData[index].data.wholesalePrice) || 0,
          quantityPrice: Number(newData[index].data.quantityPrice) || 0,
          mrp: Number(newData[index].data.mrp) || 0,
          discountType: (newData[index].data.discountType as "percentage" | "flat") || "percentage",
          saleDiscount: Number(newData[index].data.saleDiscount) || 0,
          stock: Number(newData[index].data.stock) || 0,
          minStock: Number(newData[index].data.minStock) || 0,
          maxStock: Number(newData[index].data.maxStock) || 0,
          itemLocation: newData[index].data.itemLocation?.toString() || "",
          perCartonQuantity: Number(newData[index].data.perCartonQuantity) || undefined,
          godownId: (newData[index].data.godownId as any) ?? null,
          gstRate: Number(newData[index].data.gstRate) || 18,
          taxRate: Number(newData[index].data.taxRate) || 18,
          cessRate: Number(newData[index].data.cessRate) || 0,
          inclusiveOfTax: inclusiveOfTax,
        })
        newData[index].errors = []
        newData[index].isValid = true
      } catch (error: unknown) {
        if (error instanceof Error) {
          newData[index].errors = [error.message]
          newData[index].isValid = false
        } else if (error && typeof error === "object" && "errors" in error) {
          const zodError = error as { errors: { path: string[]; message: string }[] }
          newData[index].errors = zodError.errors.map((e) => `${e.path.join(".")}: ${e.message}`)
          newData[index].isValid = false
        }
      }

      return newData
    })
  }

  const removeRow = (index: number) => {
    setParsedData((prev) => prev.filter((_, i) => i !== index))
  }

  const addRow = () => {
    setParsedData((prev) => [
      ...prev,
      {
        data: {
          id: "",
          itemCode: "",
          name: "",
          category: "",
          hsnCode: "",
          barcodeNo: "",
          unit: "PCS",
          conversionRate: 1,
          alternateUnit: "",
          purchasePrice: 0,
          salePrice: 0,
          wholesalePrice: 0,
          quantityPrice: 0,
          mrp: 0,
          discountType: "percentage",
          saleDiscount: 0,
          stock: 0,
          minStock: 0,
          maxStock: 0,
          itemLocation: "",
          perCartonQuantity: undefined,
          godownId: null,
          gstRate: 18,
          taxRate: 18,
          cessRate: 0,
          inclusiveOfTax: false,
        },
        errors: ["name: Required"],
        isValid: false,
      },
    ])
  }

  const handleDownloadTemplate = () => {
    void downloadItemExcelTemplate("item_template.xlsx", godowns.map((g) => g.name))
    toast.success("Template downloaded successfully")
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsProcessing(true)

    try {
      const data = await parseExcelFile(file)
      const parsed: ParsedItemRow[] = []

      data.forEach((row, index) => {
        try {
          const unitValue = String(row.unit || "")
            .toUpperCase()
            .trim()

          if (!validUnits.includes(unitValue as any)) {
            throw new Error(`Invalid unit "${row.unit}". Must be one of: ${validUnits.join(", ")}`)
          }

          // Parse inclusiveOfTax from Yes/No string
          const inclusiveOfTax = String(row.inclusiveOfTax || "").toLowerCase() === "yes"

          const godownName = String((row as any).godownName || (row as any).godown || "")
            .trim()
            .replace(/\s+/g, " ")
          const matchedGodown = godownName
            ? godowns.find((g) => g.name.toLowerCase() === godownName.toLowerCase())
            : undefined
          if (godownName && !matchedGodown) {
            throw new Error(`Invalid Godown "${godownName}". Please select an existing godown.`)
          }

          const validated = itemSchema.parse({
            itemCode: row.itemCode?.toString() || "",
            name: row.name,
            category: row.category?.toString() || "",
            hsnCode: row.hsnCode?.toString() || "",
            barcodeNo: row.barcodeNo?.toString() || "",
            unit: unitValue as "PCS" | "KG" | "LTR" | "MTR" | "BOX" | "DOZEN",
            conversionRate: Number(row.conversionRate) || 1,
            alternateUnit: row.alternateUnit?.toString() || "",
            purchasePrice: Number(row.purchasePrice) || 0,
            salePrice: Number(row.salePrice) || 0,
            wholesalePrice: Number(row.wholesalePrice) || 0,
            quantityPrice: Number(row.quantityPrice) || 0,
            mrp: Number(row.mrp) || 0,
            discountType: (row.discountType?.toString().toLowerCase() as "percentage" | "flat") || "percentage",
            saleDiscount: Number(row.saleDiscount) || 0,
            stock: Number(row.stock) || 0,
            minStock: Number(row.minStock) || 0,
            maxStock: Number(row.maxStock) || 0,
            itemLocation: row.itemLocation?.toString() || "",
            perCartonQuantity: Number(row.perCartonQuantity) || undefined,
            godownId: matchedGodown?.id ?? null,
            gstRate: Number(row.gstRate) || Number(row.taxRate) || 18,
            taxRate: Number(row.taxRate) || Number(row.gstRate) || 18,
            cessRate: Number(row.cessRate) || 0,
            inclusiveOfTax: inclusiveOfTax,
          })

          // Check if this is an existing item (has valid UUID)
          const itemId = row.id?.toString() || ""
          const isExistingItem = itemId.length > 10 // UUID check

          parsed.push({
            data: {
              id: isExistingItem ? itemId : `ITEM-${Date.now()}-${index}`,
              ...validated,
              godownName: matchedGodown?.name ?? (godownName || null),
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            errors: [],
            isValid: true,
          })
        } catch (error: unknown) {
          if (error instanceof Error) {
            parsed.push({
              data: {
                id: row.id?.toString() || "",
                itemCode: row.itemCode?.toString() || "",
                name: String(row.name || ""),
                category: row.category?.toString() || "",
                hsnCode: String(row.hsnCode || ""),
                barcodeNo: String(row.barcodeNo || ""),
                unit: String(row.unit || "PCS"),
                conversionRate: Number(row.conversionRate) || 1,
                alternateUnit: row.alternateUnit?.toString() || "",
                purchasePrice: Number(row.purchasePrice) || 0,
                salePrice: Number(row.salePrice) || 0,
                wholesalePrice: Number(row.wholesalePrice) || 0,
                quantityPrice: Number(row.quantityPrice) || 0,
                mrp: Number(row.mrp) || 0,
                discountType: (row.discountType?.toString().toLowerCase() as "percentage" | "flat") || "percentage",
                saleDiscount: Number(row.saleDiscount) || 0,
                stock: Number(row.stock) || 0,
                minStock: Number(row.minStock) || 0,
                maxStock: Number(row.maxStock) || 0,
                itemLocation: row.itemLocation?.toString() || "",
                perCartonQuantity: Number(row.perCartonQuantity) || undefined,
                godownName: String((row as any).godownName || (row as any).godown || "") || "",
                gstRate: Number(row.gstRate) || 18,
                taxRate: Number(row.taxRate) || 18,
                cessRate: Number(row.cessRate) || 0,
                inclusiveOfTax: String(row.inclusiveOfTax || "").toLowerCase() === "yes",
              },
              errors: [error.message],
              isValid: false,
            })
          } else if (error && typeof error === "object" && "errors" in error) {
            const zodError = error as { errors: { path: string[]; message: string }[] }
            parsed.push({
              data: {
                id: row.id?.toString() || "",
                itemCode: row.itemCode?.toString() || "",
                name: String(row.name || ""),
                category: row.category?.toString() || "",
                hsnCode: String(row.hsnCode || ""),
                barcodeNo: String(row.barcodeNo || ""),
                unit: String(row.unit || "PCS"),
                conversionRate: Number(row.conversionRate) || 1,
                alternateUnit: String(row.alternateUnit || ""),
                purchasePrice: Number(row.purchasePrice) || 0,
                salePrice: Number(row.salePrice) || 0,
                wholesalePrice: Number(row.wholesalePrice) || 0,
                quantityPrice: Number(row.quantityPrice) || 0,
                mrp: Number(row.mrp) || 0,
                discountType: (row.discountType?.toString().toLowerCase() as "percentage" | "flat") || "percentage",
                saleDiscount: Number(row.saleDiscount) || 0,
                stock: Number(row.stock) || 0,
                minStock: Number(row.minStock) || 0,
                maxStock: Number(row.maxStock) || 0,
                itemLocation: row.itemLocation?.toString() || "",
                perCartonQuantity: Number(row.perCartonQuantity) || undefined,
                godownName: String((row as any).godownName || (row as any).godown || "") || "",
                gstRate: Number(row.gstRate) || 18,
                taxRate: Number(row.taxRate) || 18,
                cessRate: Number(row.cessRate) || 0,
                inclusiveOfTax: String(row.inclusiveOfTax || "").toLowerCase() === "yes",
              },
              errors: zodError.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
              isValid: false,
            })
          }
        }
      })

      setParsedData(parsed)
      setStep("confirm")
      toast.success(`Parsed ${parsed.length} records. Please review before submitting.`)
    } catch (error) {
      toast.error("Failed to parse Excel file")
    } finally {
      setIsProcessing(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleConfirmUpload = async () => {
    const validRows = parsedData.filter((row) => row.isValid)

    if (validRows.length === 0) {
      toast.error("No valid records to upload")
      return
    }

    setIsProcessing(true)
    try {
      const result = await bulkImportItems(validRows.map((row) => row.data as IItem))
      
      if (result.success) {
        const message = result.message || `Successfully imported ${validRows.length} items`
        toast.success(message)
      } else {
        toast.error(result.error || "Failed to import items")
      }
      
      setOpen(false)
      setStep("upload")
      setParsedData([])
    } catch (error) {
      toast.error("Failed to import items")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCancel = () => {
    setOpen(false)
    setStep("upload")
    setParsedData([])
  }

  const validCount = parsedData.filter((row) => row.isValid).length
  const invalidCount = parsedData.length - validCount

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="gap-2">
        <Upload className="w-4 h-4" />
        Bulk Upload
      </Button>

      <Dialog open={open} onOpenChange={handleCancel}>
        <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{step === "upload" ? "Bulk Upload Items" : "Review & Confirm Upload"}</DialogTitle>
          </DialogHeader>

          {step === "upload" ? (
            <div className="space-y-4 mt-4">
              <Alert>
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>
                  Download the template, fill in item data, and upload the completed file. You'll be able to review and
                  modify all records before submitting.
                  <br />
                  <br />
                  <strong>Important:</strong> For the <strong>unit</strong> column, use one of: PCS, KG, LTR, MTR, BOX,
                  or DOZEN.
                </AlertDescription>
              </Alert>

              <div className="flex gap-3">
                <Button variant="outline" onClick={handleDownloadTemplate} className="gap-2 bg-transparent">
                  <Download className="w-4 h-4" />
                  Download Template
                </Button>

                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="item-upload"
                  />
                  <Button asChild variant="default" disabled={isProcessing} className="gap-2">
                    <label htmlFor="item-upload" className="cursor-pointer">
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          Upload File
                        </>
                      )}
                    </label>
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 mt-4">
              {/* Summary Stats */}
              <div className="flex gap-3">
                <Badge
                  variant="secondary"
                  className="bg-green-500/10 text-green-700 dark:text-green-400 text-base px-4 py-2"
                >
                  <Check className="w-4 h-4 mr-2" />
                  {validCount} Valid
                </Badge>
                {invalidCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="bg-orange-500/10 text-orange-700 dark:text-orange-400 text-base px-4 py-2"
                  >
                    <AlertCircle className="w-4 h-4 mr-2" />
                    {invalidCount} Invalid
                  </Badge>
                )}
              </div>

              {/* Data Table - Scrollable */}
              <div className="border rounded-lg max-h-125 overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="w-12">Status</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>HSN Code</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Purchase Price</TableHead>
                      <TableHead>Sale Price</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>GST Rate</TableHead>
                      <TableHead className="w-12">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.map((row, index) => (
                      <TableRow key={index} className={!row.isValid ? "bg-orange-500/5" : ""}>
                        <TableCell>
                          {row.isValid ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-orange-600" aria-label={row.errors.join(", ")} />
                          )}
                        </TableCell>
                        <TableCell>
                          <Input
                            value={row.data.name || ""}
                            onChange={(e) => updateRow(index, "name", e.target.value)}
                            className={
                              !row.isValid && row.errors.some((e) => e.includes("name"))
                                ? "border-orange-500 min-w-50"
                                : "min-w-50"
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={row.data.hsnCode || ""}
                            onChange={(e) => updateRow(index, "hsnCode", e.target.value)}
                            className={
                              !row.isValid && row.errors.some((e) => e.includes("hsnCode"))
                                ? "border-orange-500 min-w-30"
                                : "min-w-30"
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={row.data.unit || "PCS"}
                            onValueChange={(value) => updateRow(index, "unit", value)}
                          >
                            <SelectTrigger
                              className={
                                !row.isValid && row.errors.some((e) => e.includes("unit"))
                                  ? "border-orange-500 w-25"
                                  : "w-25"
                              }
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {validUnits.map((unit) => (
                                <SelectItem key={unit} value={unit}>
                                  {unit}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={row.data.purchasePrice || 0}
                            onChange={(e) => updateRow(index, "purchasePrice", Number.parseFloat(e.target.value) || 0)}
                            className="min-w-30"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={row.data.salePrice || 0}
                            onChange={(e) => updateRow(index, "salePrice", Number.parseFloat(e.target.value) || 0)}
                            className="min-w-30"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={row.data.stock || 0}
                            onChange={(e) => updateRow(index, "stock", Number.parseFloat(e.target.value) || 0)}
                            className="min-w-25"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={row.data.gstRate || 18}
                            onChange={(e) => updateRow(index, "gstRate", Number.parseFloat(e.target.value) || 18)}
                            className="min-w-20"
                          />
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
                Add Row
              </Button>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={handleCancel} disabled={isProcessing}>
                  Cancel
                </Button>
                <Button onClick={handleConfirmUpload} disabled={isProcessing || validCount === 0} className="gap-2">
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Upload {validCount} Item{validCount !== 1 ? "s" : ""}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
