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
import { Progress } from "@/components/ui/progress"
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
  const [parseProgress, setParseProgress] = useState(0)
  const [showOnlyInvalid, setShowOnlyInvalid] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validUnits: Array<"PCS" | "KG" | "LTR" | "MTR" | "BOX" | "DOZEN" | "PKT" | "BAG"> = ["PCS", "KG", "LTR", "MTR", "BOX", "DOZEN", "PKT", "BAG"]

  // Map user input variations to standard units
  const unitMappings: Record<string, "PCS" | "KG" | "LTR" | "MTR" | "BOX" | "DOZEN" | "PKT" | "BAG"> = {
    // PCS variants
    "PIECE": "PCS",
    "PIECES": "PCS",
    "PCE": "PCS",
    "PCES": "PCS",
    "P": "PCS",
    "PCS.": "PCS",
    // KG variants
    "KGS": "KG",
    "KILOGRAM": "KG",
    "KILOGRAMS": "KG",
    "KG.": "KG",
    // LTR variants
    "LITRE": "LTR",
    "LITRES": "LTR",
    "LITER": "LTR",
    "LITERS": "LTR",
    "LTR.": "LTR",
    "L": "LTR",
    // MTR variants
    "METRE": "MTR",
    "METRES": "MTR",
    "METER": "MTR",
    "METERS": "MTR",
    "MTR.": "MTR",
    "M": "MTR",
    // BOX variants
    "BOXES": "BOX",
    "BOX.": "BOX",
    "BX": "BOX",
    // DOZEN variants
    "DOZENS": "DOZEN",
    "DOZEN.": "DOZEN",
    "DOZ": "DOZEN",
    // PKT variants
    "PACKET": "PKT",
    "PACKETS": "PKT",
    "PKT.": "PKT",
    // BAG variants
    "BAGS": "BAG",
    "BAG.": "BAG",
  }

  // Function to normalize unit input
  const normalizeUnit = (input: string) => {
    const normalized = String(input || "").toUpperCase().trim()
    
    // Check if it's already a valid unit
    if (validUnits.includes(normalized as "PCS" | "KG" | "LTR" | "MTR" | "BOX" | "DOZEN" | "PKT" | "BAG")) {
      return normalized as "PCS" | "KG" | "LTR" | "MTR" | "BOX" | "DOZEN" | "PKT" | "BAG"
    }
    
    // Check if it matches a mapping
    if (unitMappings[normalized]) {
      return unitMappings[normalized]
    }
    
    // Return original if not found (will fail validation later)
    return normalized as "PCS" | "KG" | "LTR" | "MTR" | "BOX" | "DOZEN" | "PKT" | "BAG"
  }

  // Helper function to safely parse numeric fields, handling NaN
  const safeParseNumber = (value: unknown): number | undefined => {
    if (value === null || value === undefined || value === "") return undefined
    const num = Number(value)
    return isNaN(num) ? undefined : num
  }

  const updateRow = (index: number, field: keyof IItem, value: string | number) => {
    setParsedData((prev) => {
      const newData = [...prev]
      newData[index].data = { ...newData[index].data, [field]: value }

      // Revalidate the row
      try {
        const unitValue = normalizeUnit(String(newData[index].data.unit || ""))
        newData[index].data.unit = unitValue
        
        if (!validUnits.includes(unitValue)) {
          throw new Error(`Invalid unit "${newData[index].data.unit}". Must be one of: ${validUnits.join(", ")}`)
        }

        const inclusiveOfTax = String(newData[index].data.inclusiveOfTax || "false").toLowerCase() === "true" ||
          String(newData[index].data.inclusiveOfTax || "").toLowerCase() === "yes"

        itemSchema.parse({
          itemCode: newData[index].data.itemCode?.toString() || "",
          name: newData[index].data.name,
          description: (newData[index].data.description?.toString() || "").trim() || undefined, // Skip empty description
          category: newData[index].data.category?.toString() || "",
          hsnCode: newData[index].data.hsnCode?.toString() || "",
          barcodeNo: newData[index].data.barcodeNo?.toString() || "",
          unit: unitValue as "PCS" | "KG" | "LTR" | "MTR" | "BOX" | "DOZEN" | "PKT" | "BAG",
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
          perCartonQuantity: safeParseNumber(newData[index].data.perCartonQuantity),
          godownId: newData[index].data.godownId || null,
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
          perCartonQuantity: 1,
          godownId: null,
          gstRate: 18,
          taxRate: 18,
          cessRate: 0,
          inclusiveOfTax: true,
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
    setParseProgress(0)

    try {
      const data = await parseExcelFile(file)
      const parsed: ParsedItemRow[] = []

      // Process rows asynchronously with progress updates
      for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
        const row = data[rowIndex]
        
        try {
          const unitValue = normalizeUnit(String(row.unit || ""))

          if (!validUnits.includes(unitValue)) {
            throw new Error(`Invalid unit "${row.unit}". Must be one of: ${validUnits.join(", ")}`)
          }

          // Parse inclusiveOfTax from Yes/No string
          const inclusiveOfTax = String(row.inclusiveOfTax || "").toLowerCase() === "yes"

          const godownName = String(
            (row as Record<string, unknown>).godownName || 
            (row as Record<string, unknown>).godown || 
            ""
          )
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
            description: (row.description?.toString() || "").trim() || undefined, // Skip empty description
            category: row.category?.toString() || "",
            hsnCode: row.hsnCode?.toString() || "",
            barcodeNo: row.barcodeNo?.toString() || "",
            unit: unitValue as "PCS" | "KG" | "LTR" | "MTR" | "BOX" | "DOZEN" | "PKT" | "BAG",
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
            perCartonQuantity: safeParseNumber(row.perCartonQuantity),
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
              id: isExistingItem ? itemId : `ITEM-${Date.now()}-${rowIndex}`,
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
                description: (row.description?.toString() || "").trim() || "", // Skip empty description
                category: row.category?.toString() || "",
                hsnCode: String(row.hsnCode || ""),
                barcodeNo: String(row.barcodeNo || ""),
                unit: normalizeUnit(String(row.unit || "PCS")),
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
                perCartonQuantity: safeParseNumber(row.perCartonQuantity),
                godownName: String(
                  (row as Record<string, unknown>).godownName || 
                  (row as Record<string, unknown>).godown || 
                  ""
                ) || "",
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
                description: (row.description?.toString() || "").trim() || "", // Skip empty description
                category: row.category?.toString() || "",
                hsnCode: String(row.hsnCode || ""),
                barcodeNo: String(row.barcodeNo || ""),
                unit: normalizeUnit(String(row.unit || "PCS")),
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
                perCartonQuantity: safeParseNumber(row.perCartonQuantity),
                godownName: String(
                  (row as Record<string, unknown>).godownName || 
                  (row as Record<string, unknown>).godown || 
                  ""
                ) || "",
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

        // Update progress every 50 rows or on last row to avoid too many renders
        if ((rowIndex + 1) % 50 === 0 || rowIndex === data.length - 1) {
          setParseProgress(Math.round(((rowIndex + 1) / data.length) * 100))
          // Allow UI to update
          await new Promise(resolve => setTimeout(resolve, 0))
        }
      }

      setParsedData(parsed)
      setStep("confirm")
      toast.success(`Parsed ${parsed.length} records. Please review before submitting.`)
    } catch {
      toast.error("Failed to parse Excel file")
    } finally {
      setIsProcessing(false)
      setParseProgress(0)
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
      const itemsToUpload = validRows.map((row) => row.data as IItem)
      const CHUNK_SIZE = 250 // Send 250 items per request (safer payload size)
      
      let totalImported = 0
      let totalErrors = 0
      const allErrors: string[] = []

      for (let i = 0; i < itemsToUpload.length; i += CHUNK_SIZE) {
        const chunk = itemsToUpload.slice(i, i + CHUNK_SIZE)
        const chunkNum = Math.floor(i / CHUNK_SIZE) + 1
        const totalChunks = Math.ceil(itemsToUpload.length / CHUNK_SIZE)
        
        toast.loading(`Uploading batch ${chunkNum}/${totalChunks} (${chunk.length} items)...`)
        
        try {
          const result = await bulkImportItems(chunk)
          
          if (result.success || ((result.inserted || 0) + (result.updated || 0) > 0)) {
            const imported = (result.inserted || 0) + (result.updated || 0)
            totalImported += imported
            toast.success(`Batch ${chunkNum}: ${imported}/${chunk.length} items imported`)
            
            if (result.details && result.details.length > 0) {
              totalErrors += result.details.length
              allErrors.push(...result.details.slice(0, 5)) // Collect first 5 errors per batch
            }
          } else {
            toast.error(`Batch ${chunkNum} failed: ${result.error}`)
            totalErrors += chunk.length
            if (result.details && result.details.length > 0) {
              allErrors.push(result.details[0])
            }
          }
        } catch (chunkError) {
          const errorMsg = chunkError instanceof Error ? chunkError.message : "Unknown error"
          console.error(`[CHUNK ${chunkNum}] Error:`, chunkError)
          toast.error(`Batch ${chunkNum} error: ${errorMsg}`)
          totalErrors += chunk.length
          allErrors.push(`Batch ${chunkNum}: ${errorMsg}`)
        }
      }
      
      // Final summary
      if (totalImported > 0) {
        const message = `✅ Import complete: ${totalImported}/${itemsToUpload.length} items imported${totalErrors > 0 ? ` (${totalErrors} errors)` : ""}`
        if (totalErrors === 0) {
          toast.success(message)
        } else {
          toast.warning(message)
        }
        
        if (allErrors.length > 0) {
          console.error("Import errors:", allErrors)
          toast.info(`First error: ${allErrors[0]}`)
        }
        
        setOpen(false)
        setStep("upload")
        setParsedData([])
      } else {
        toast.error(`Upload failed: 0/${itemsToUpload.length} items imported`)
        if (allErrors.length > 0) {
          console.error("Import errors:", allErrors)
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error"
      console.error("Upload process error:", error)
      toast.error(`Upload failed: ${errorMsg}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCancel = () => {
    setOpen(false)
    setStep("upload")
    setParsedData([])
  }

  // Prevent closing dialog by clicking outside - only allow programmatic close via Cancel button
  const handleDialogOpenChange = (newOpen: boolean) => {
    if (!newOpen && step === "confirm") {
      // Don't close if user clicks outside during confirm step
      return
    }
    if (!newOpen) {
      setOpen(false)
    }
  }

  const validCount = parsedData.filter((row) => row.isValid).length
  const invalidCount = parsedData.length - validCount

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="gap-2">
        <Upload className="w-4 h-4" />
        Bulk Upload
      </Button>

      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="w-full h-auto max-h-[90vh] overflow-y-auto p-6">
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
                  or DOZEN, PKT, BAG (case-insensitive).
                </AlertDescription>
              </Alert>

              {isProcessing && parseProgress > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="text-sm font-medium">Parsing Excel file...</div>
                    <div className="text-sm text-muted-foreground">{parseProgress}%</div>
                  </div>
                  <Progress value={parseProgress} className="h-2" />
                </div>
              )}

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
              {/* Update Fields Info Banner */}
              <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <AlertDescription className="text-blue-800 dark:text-blue-200">
                  <strong>⚙️ Update Fields:</strong> For matched items (by name & category), the following fields will be updated:
                  <div className="mt-2 ml-4">
                    <div>✅ <strong>Unit</strong> (PCS, KG, LTR, etc.)</div>
                    <div>✅ <strong>Description</strong></div>
                  </div>
                  <div className="mt-2 text-sm italic">Note: This is a temporary modification. Other fields will be updatable in future versions.</div>
                </AlertDescription>
              </Alert>

              {/* Summary Stats */}
              <div className="flex gap-3 items-center">
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
                <div className="ml-auto text-sm text-muted-foreground">
                  Showing {parsedData.length} of {parsedData.length} records
                </div>
              </div>

              {/* Filter Invalid Items Toggle */}
              {invalidCount > 0 && (
                <div className="flex items-center gap-3">
                  <Button
                    variant={showOnlyInvalid ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowOnlyInvalid(!showOnlyInvalid)}
                    className="gap-2"
                  >
                    <AlertCircle className="w-4 h-4" />
                    {showOnlyInvalid ? `Show Only Invalid (${invalidCount})` : `Show All (${parsedData.length})`}
                  </Button>
                  {showOnlyInvalid && (
                    <span className="text-sm text-orange-600 dark:text-orange-400">
                      Filtered to show {invalidCount} invalid record{invalidCount !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              )}

              {/* Help Text for Invalid Records */}
              {invalidCount > 0 && (
                <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                  <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <AlertDescription className="text-blue-800 dark:text-blue-200">
                    <strong>Tip:</strong> Hover over the error icon (⊙) next to invalid rows to see what's missing or incorrect. Common issues: empty item name, invalid unit, or missing prices.
                  </AlertDescription>
                </Alert>
              )}

              {/* Data Table - Scrollable */}
              <div className="border rounded-lg w-full">
                <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow>
                        <TableHead className="w-12">Status</TableHead>
                        <TableHead className="min-w-[120px]">Item Code</TableHead>
                        <TableHead className="min-w-[200px]">Name</TableHead>
                        <TableHead className="min-w-[180px]">Description</TableHead>
                        <TableHead className="min-w-[100px]">Category</TableHead>
                        <TableHead className="min-w-[120px]">HSN Code</TableHead>
                        <TableHead className="min-w-[100px]">Barcode</TableHead>
                        <TableHead className="min-w-[80px]">Unit</TableHead>
                        <TableHead className="min-w-[120px]">Purchase Price</TableHead>
                        <TableHead className="min-w-[120px]">Wholesale Price</TableHead>
                        <TableHead className="min-w-[120px]">Sale Price</TableHead>
                        <TableHead className="min-w-[100px]">Stock</TableHead>
                        <TableHead className="min-w-[100px]">Min Stock</TableHead>
                        <TableHead className="min-w-[110px]">GST Rate</TableHead>
                        <TableHead className="min-w-[140px]">Per Carton Qty</TableHead>
                        <TableHead className="w-12">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(showOnlyInvalid ? parsedData.filter(row => !row.isValid) : parsedData).map((row, index) => (
                        <TableRow key={index} className={!row.isValid ? "bg-orange-500/5" : ""}>
                          <TableCell className="w-12">
                            {row.isValid ? (
                              <Check className="w-4 h-4 text-green-600" />
                            ) : (
                              <div className="group relative">
                                <AlertCircle className="w-4 h-4 text-orange-600 cursor-help" />
                                <div className="invisible group-hover:visible absolute bottom-full left-0 mb-2 w-max bg-gray-900 text-white text-xs p-3 rounded z-50 max-w-sm">
                                  <div className="space-y-1">
                                    {row.errors.map((error, idx) => (
                                      <div key={idx} className="whitespace-normal">
                                        • {error}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="min-w-[120px]">
                            <Input
                              value={row.data.itemCode || ""}
                              onChange={(e) => updateRow(index, "itemCode", e.target.value)}
                              className="text-sm"
                              placeholder="Auto-generated"
                            />
                          </TableCell>
                          <TableCell className="min-w-[200px]">
                            <Input
                              value={row.data.name || ""}
                              onChange={(e) => updateRow(index, "name", e.target.value)}
                              className={
                                !row.isValid && row.errors.some((e) => e.includes("name"))
                                  ? "border-orange-500 text-sm"
                                  : "text-sm"
                              }
                              placeholder="Item name"
                            />
                          </TableCell>
                          <TableCell className="min-w-[180px]">
                            <Input
                              value={row.data.description || ""}
                              onChange={(e) => updateRow(index, "description", e.target.value)}
                              className="text-sm"
                              placeholder="Item description"
                            />
                          </TableCell>
                          <TableCell className="min-w-[100px]">
                            <Input
                              value={row.data.category || ""}
                              onChange={(e) => updateRow(index, "category", e.target.value)}
                              className="text-sm"
                              placeholder="Category"
                            />
                          </TableCell>
                          <TableCell className="min-w-[120px]">
                            <Input
                              value={row.data.hsnCode || ""}
                              onChange={(e) => updateRow(index, "hsnCode", e.target.value)}
                              className={
                                !row.isValid && row.errors.some((e) => e.includes("hsnCode"))
                                  ? "border-orange-500 text-sm"
                                  : "text-sm"
                              }
                              placeholder="HSN"
                            />
                          </TableCell>
                          <TableCell className="min-w-[100px]">
                            <Input
                              value={row.data.barcodeNo || ""}
                              onChange={(e) => updateRow(index, "barcodeNo", e.target.value)}
                              className="text-sm"
                              placeholder="Barcode"
                            />
                          </TableCell>
                          <TableCell className="min-w-[80px]">
                            <Select
                              value={row.data.unit || "PCS"}
                              onValueChange={(value) => updateRow(index, "unit", value)}
                            >
                              <SelectTrigger
                                className={
                                  !row.isValid && row.errors.some((e) => e.includes("unit"))
                                    ? "border-orange-500 text-sm"
                                    : "text-sm"
                                }
                              >
                                <SelectValue placeholder="Unit">{row.data.unit || "PCS"}</SelectValue>
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
                          <TableCell className="min-w-[120px]">
                            <Input
                              type="number"
                              value={row.data.purchasePrice || 0}
                              onChange={(e) => updateRow(index, "purchasePrice", Number.parseFloat(e.target.value) || 0)}
                              className="text-sm"
                              placeholder="0"
                            />
                          </TableCell>
                          <TableCell className="min-w-[120px]">
                            <Input
                              type="number"
                              value={row.data.wholesalePrice || 0}
                              onChange={(e) => updateRow(index, "wholesalePrice", Number.parseFloat(e.target.value) || 0)}
                              className="text-sm"
                              placeholder="0"
                            />
                          </TableCell>
                          <TableCell className="min-w-[120px]">
                            <Input
                              type="number"
                              value={row.data.salePrice || 0}
                              onChange={(e) => updateRow(index, "salePrice", Number.parseFloat(e.target.value) || 0)}
                              className="text-sm"
                              placeholder="0"
                            />
                          </TableCell>
                          <TableCell className="min-w-[100px]">
                            <Input
                              type="number"
                              value={row.data.stock || 0}
                              onChange={(e) => updateRow(index, "stock", Number.parseFloat(e.target.value) || 0)}
                              className="text-sm"
                              placeholder="0"
                            />
                          </TableCell>
                          <TableCell className="min-w-[100px]">
                            <Input
                              type="number"
                              value={row.data.minStock || 0}
                              onChange={(e) => updateRow(index, "minStock", Number.parseFloat(e.target.value) || 0)}
                              className="text-sm"
                              placeholder="0"
                            />
                          </TableCell>
                          <TableCell className="min-w-[110px]">
                            <Input
                              type="number"
                              value={row.data.gstRate || 18}
                              onChange={(e) => updateRow(index, "gstRate", Number.parseFloat(e.target.value) || 18)}
                              className="text-sm"
                              placeholder="18"
                            />
                          </TableCell>
                          <TableCell className="min-w-[140px]">
                            <Input
                              type="number"
                              value={row.data.perCartonQuantity || ""}
                              onChange={(e) => updateRow(index, "perCartonQuantity", e.target.value ? Number.parseFloat(e.target.value) : "")}
                              className="text-sm"
                              placeholder="Per carton qty"
                            />
                          </TableCell>
                          <TableCell className="w-12">
                            <Button variant="ghost" size="icon" onClick={() => removeRow(index)}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
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
