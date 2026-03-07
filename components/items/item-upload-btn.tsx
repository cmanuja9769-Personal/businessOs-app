"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Upload, Download, AlertCircle, Loader2, Trash2, Plus, Check } from "lucide-react"
import { parseExcelFile, downloadItemExcelTemplate } from "@/lib/excel-parser"
import { itemSchema } from "@/lib/schemas"
import { bulkImportItems } from "@/app/items/import-actions"
import { toast } from "sonner"
import type { IItem, PackagingUnit } from "@/types"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

const ERROR_INPUT_CLASS = "border-orange-500 text-sm"

type UploadStep = "upload" | "confirm"
type ItemUnit = "PCS" | "KG" | "LTR" | "MTR" | "BOX" | "DOZEN" | "PKT" | "BAG"

interface ParsedItemRow {
  data: Partial<IItem>
  errors: string[]
  isValid: boolean
}

const VALID_UNITS: ItemUnit[] = ["PCS", "KG", "LTR", "MTR", "BOX", "DOZEN", "PKT", "BAG"]
const VALID_PACKAGING_UNITS: PackagingUnit[] = ["CTN", "GONI", "BAG", "BUNDLE", "PKT", "BOX", "CASE", "ROLL", "DRUM"]

const UNIT_MAPPINGS: Record<string, ItemUnit> = {
  "PIECE": "PCS", "PIECES": "PCS", "PCE": "PCS", "PCES": "PCS", "P": "PCS", "PCS.": "PCS",
  "KGS": "KG", "KILOGRAM": "KG", "KILOGRAMS": "KG", "KG.": "KG",
  "LITRE": "LTR", "LITRES": "LTR", "LITER": "LTR", "LITERS": "LTR", "LTR.": "LTR", "L": "LTR",
  "METRE": "MTR", "METRES": "MTR", "METER": "MTR", "METERS": "MTR", "MTR.": "MTR", "M": "MTR",
  "BOXES": "BOX", "BOX.": "BOX", "BX": "BOX",
  "DOZENS": "DOZEN", "DOZEN.": "DOZEN", "DOZ": "DOZEN",
  "PACKET": "PKT", "PACKETS": "PKT", "PKT.": "PKT",
  "BAGS": "BAG", "BAG.": "BAG",
}

const PACKAGING_UNIT_MAPPINGS: Record<string, PackagingUnit> = {
  "CARTON": "CTN", "CARTONS": "CTN", "CTN.": "CTN",
  "SACK": "GONI", "SACKS": "GONI", "GONI.": "GONI",
  "BAGS": "BAG", "BAG.": "BAG",
  "BUNDLES": "BUNDLE", "BUNDLE.": "BUNDLE", "BDL": "BUNDLE",
  "PACKET": "PKT", "PACKETS": "PKT", "PKT.": "PKT",
  "BOXES": "BOX", "BOX.": "BOX", "BX": "BOX",
  "CASES": "CASE", "CASE.": "CASE",
  "ROLLS": "ROLL", "ROLL.": "ROLL",
  "DRUMS": "DRUM", "DRUM.": "DRUM",
}

const ITEM_SKIP_WORDS = new Set([
  "the", "a", "an", "of", "for", "and", "or",
  "in", "on", "at", "to", "cm", "mm", "m", "kg", "g", "l", "ml",
])

function normalizeUnit(input: string): ItemUnit {
  const normalized = String(input || "").toUpperCase().trim()
  if (VALID_UNITS.includes(normalized as ItemUnit)) return normalized as ItemUnit
  return UNIT_MAPPINGS[normalized] ?? normalized as ItemUnit
}

function normalizePackagingUnit(input: string): PackagingUnit {
  const normalized = String(input || "").toUpperCase().trim()
  if (VALID_PACKAGING_UNITS.includes(normalized as PackagingUnit)) return normalized as PackagingUnit
  return PACKAGING_UNIT_MAPPINGS[normalized] ?? "CTN" as PackagingUnit
}

function safeParseNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined
  if (typeof value === "string" && value.trim() === "") return undefined
  const num = Number(value)
  return isNaN(num) || !isFinite(num) ? undefined : num
}

function truncateCodeWord(word: string): string {
  if (word.length <= 3) return word
  if (word.length <= 6) return word.slice(0, 4)
  return word.slice(0, 5)
}

function codePartFromWord(word: string): string | null {
  if (ITEM_SKIP_WORDS.has(word.toLowerCase())) return null
  if (/^\d+$/.test(word)) return word
  const cleaned = word.replace(/[^a-zA-Z0-9]/g, "")
  if (!cleaned) return null
  return truncateCodeWord(cleaned)
}

function generateItemCodeFromName(name: string, index: number): string {
  if (!name) return `ITEM-${Date.now()}-${index}`
  return name.trim().split(/\s+/).map(codePartFromWord).filter(Boolean).join("").toUpperCase()
}

function parseInclusiveOfTax(value: unknown): boolean {
  const str = String(value || "").toLowerCase()
  return str === "true" || str === "yes"
}

function extractValidationErrors(error: unknown): string[] {
  if (error instanceof Error) return [error.message]
  if (error && typeof error === "object" && "errors" in error) {
    const zodError = error as { errors: { path: string[]; message: string }[] }
    return zodError.errors.map((e) => `${e.path.join(".")}: ${e.message}`)
  }
  return ["Unknown validation error"]
}

function buildSchemaInput(data: Partial<IItem>, godownId?: string | null): Record<string, unknown> {
  return {
    itemCode: data.itemCode?.toString() || "",
    name: data.name,
    description: (data.description?.toString() || "").trim() || undefined,
    category: data.category?.toString() || "",
    hsnCode: data.hsnCode?.toString() || "",
    barcodeNo: data.barcodeNo?.toString() || "",
    unit: normalizeUnit(String(data.unit || "")) as ItemUnit,
    conversionRate: Number(data.conversionRate) || 1,
    alternateUnit: data.alternateUnit?.toString() || "",
    packagingUnit: normalizePackagingUnit(String(data.packagingUnit || "CTN")),
    purchasePrice: Number(data.purchasePrice) || 0,
    salePrice: Number(data.salePrice) || 0,
    wholesalePrice: Number(data.wholesalePrice) || 0,
    quantityPrice: Number(data.quantityPrice) || 0,
    mrp: Number(data.mrp) || 0,
    discountType: (data.discountType as "percentage" | "flat") || "percentage",
    saleDiscount: Number(data.saleDiscount) || 0,
    stock: Number(data.stock) || 0,
    minStock: Number(data.minStock) || 0,
    maxStock: Number(data.maxStock) || 0,
    itemLocation: data.itemLocation?.toString() || "",
    perCartonQuantity: safeParseNumber(data.perCartonQuantity),
    godownId: godownId !== undefined ? godownId : (data.godownId || null),
    gstRate: Number(data.gstRate) || 18,
    taxRate: Number(data.taxRate) || 18,
    cessRate: Number(data.cessRate) || 0,
    inclusiveOfTax: parseInclusiveOfTax(data.inclusiveOfTax),
  }
}

function validateRowData(data: Partial<IItem>): { isValid: boolean; errors: string[] } {
  const unitValue = normalizeUnit(String(data.unit || ""))
  if (!VALID_UNITS.includes(unitValue)) {
    return { isValid: false, errors: [`Invalid unit "${data.unit}". Must be one of: ${VALID_UNITS.join(", ")}`] }
  }
  try {
    itemSchema.parse(buildSchemaInput(data))
    return { isValid: true, errors: [] }
  } catch (error: unknown) {
    return { isValid: false, errors: extractValidationErrors(error) }
  }
}

function resolveGodownByName(
  godownName: string,
  godowns: Array<{ id: string; name: string }>
): { id: string; name: string } | undefined {
  const trimmed = godownName.trim().replace(/\s+/g, " ")
  if (!trimmed) return undefined
  return godowns.find((g) => g.name.toLowerCase() === trimmed.toLowerCase())
}

function buildRawRowData(
  row: Record<string, unknown>,
  rowIndex: number,
  godownName: string
): Partial<IItem> {
  return {
    id: String(row.id || ""),
    itemCode: String(row.itemCode || "") || generateItemCodeFromName(String(row.name || ""), rowIndex),
    name: String(row.name || ""),
    description: (String(row.description || "")).trim() || "",
    category: String(row.category || ""),
    hsnCode: String(row.hsnCode || ""),
    barcodeNo: String(row.barcodeNo || ""),
    unit: normalizeUnit(String(row.unit || "PCS")),
    packagingUnit: normalizePackagingUnit(String(row.packagingUnit || "CTN")),
    conversionRate: Number(row.conversionRate) || 1,
    alternateUnit: String(row.alternateUnit || ""),
    purchasePrice: Number(row.purchasePrice) || 0,
    salePrice: Number(row.salePrice) || 0,
    wholesalePrice: Number(row.wholesalePrice) || 0,
    quantityPrice: Number(row.quantityPrice) || 0,
    mrp: Number(row.mrp) || 0,
    discountType: (String(row.discountType || "").toLowerCase() as "percentage" | "flat") || "percentage",
    saleDiscount: Number(row.saleDiscount) || 0,
    stock: Number(row.stock) || 0,
    minStock: Number(row.minStock) || 0,
    maxStock: Number(row.maxStock) || 0,
    itemLocation: String(row.itemLocation || ""),
    perCartonQuantity: safeParseNumber(row.perCartonQuantity),
    godownName: godownName || "",
    gstRate: Number(row.gstRate) || 18,
    taxRate: Number(row.taxRate) || 18,
    cessRate: Number(row.cessRate) || 0,
    inclusiveOfTax: parseInclusiveOfTax(row.inclusiveOfTax),
  }
}

function extractGodownName(row: Record<string, unknown>): string {
  return String(row.godownName || row.godown || "").trim().replace(/\s+/g, " ")
}

function parseExcelRow(
  row: Record<string, unknown>,
  rowIndex: number,
  godowns: Array<{ id: string; name: string }>
): ParsedItemRow {
  const godownName = extractGodownName(row)
  const matchedGodown = resolveGodownByName(godownName, godowns)

  if (godownName && !matchedGodown) {
    return {
      data: buildRawRowData(row, rowIndex, godownName),
      errors: [`Invalid Godown "${godownName}". Please select an existing godown.`],
      isValid: false,
    }
  }

  const unitValue = normalizeUnit(String(row.unit || ""))
  const packagingUnitValue = normalizePackagingUnit(String(row.packagingUnit || "CTN"))
  const inclusiveOfTax = String(row.inclusiveOfTax || "").toLowerCase() === "yes"

  try {
    const validated = itemSchema.parse({
      itemCode: row.itemCode?.toString() || generateItemCodeFromName(String(row.name || ""), rowIndex),
      name: row.name,
      description: (row.description?.toString() || "").trim() || undefined,
      category: row.category?.toString() || "",
      hsnCode: row.hsnCode?.toString() || "",
      barcodeNo: row.barcodeNo?.toString() || "",
      unit: unitValue as ItemUnit,
      conversionRate: Number(row.conversionRate) || 1,
      alternateUnit: row.alternateUnit?.toString() || "",
      packagingUnit: packagingUnitValue,
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
      inclusiveOfTax,
    })

    const itemId = row.id?.toString() || ""
    const isExistingItem = itemId.length > 10

    return {
      data: {
        id: isExistingItem ? itemId : `ITEM-${Date.now()}-${rowIndex}`,
        ...validated,
        packagingUnit: validated.packagingUnit as PackagingUnit | undefined,
        godownName: matchedGodown?.name ?? (godownName || null),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      errors: [],
      isValid: true,
    }
  } catch (error: unknown) {
    return {
      data: buildRawRowData(row, rowIndex, godownName),
      errors: extractValidationErrors(error),
      isValid: false,
    }
  }
}

type ChunkResult = {
  imported: number
  failedCount: number
  chunkErrors: string[]
  debugBlocks: string[]
}

async function processUploadChunk(
  chunk: IItem[],
  chunkNum: number,
  totalChunks: number
): Promise<ChunkResult> {
  const batchToastId = toast.loading(`Uploading batch ${chunkNum}/${totalChunks} (${chunk.length} items)...`)

  try {
    const result = await bulkImportItems(chunk)
    const debugBlocks = (Array.isArray((result as Record<string, unknown>).debugBlocks))
      ? (result as Record<string, unknown>).debugBlocks as string[]
      : []
    const imported = (result.inserted || 0) + (result.updated || 0)
    const isSuccess = result.success || imported > 0

    if (!isSuccess) {
      toast.error(`Batch ${chunkNum} failed: ${result.error}`, { id: batchToastId })
      return { imported: 0, chunkErrors: result.details?.slice(0, 1) ?? [], debugBlocks, failedCount: chunk.length }
    }

    toast.success(`Batch ${chunkNum}: ${imported}/${chunk.length} items imported`, { id: batchToastId })
    const errorDetails = result.details?.slice(0, 5) ?? []
    return { imported, chunkErrors: errorDetails, debugBlocks, failedCount: errorDetails.length }
  } catch (chunkError) {
    const errorMsg = chunkError instanceof Error ? chunkError.message : "Unknown error"
    console.error(`[CHUNK ${chunkNum}] Error:`, chunkError)
    toast.error(`Batch ${chunkNum} error: ${errorMsg}`, { id: batchToastId })
    return { imported: 0, chunkErrors: [`Batch ${chunkNum}: ${errorMsg}`], debugBlocks: [], failedCount: chunk.length }
  }
}

function showFinalImportToast(totalImported: number, totalErrors: number, total: number, allErrors: string[]): void {
  if (totalImported === 0) {
    toast.error(`Upload failed: 0/${total} items imported`)
    if (allErrors.length > 0) console.error("Import errors:", allErrors)
    return
  }

  const message = `✅ Import complete: ${totalImported}/${total} items imported${totalErrors > 0 ? ` (${totalErrors} errors)` : ""}`
  toast[totalErrors === 0 ? "success" : "warning"](message)

  if (allErrors.length > 0) {
    console.error("Import errors:", allErrors)
    toast.info(`First error: ${allErrors[0]}`)
  }
}

async function parseFileToRows(
  file: File,
  godowns: Array<{ id: string; name: string }>,
  onProgress: (pct: number) => void,
): Promise<ParsedItemRow[]> {
  const data = await parseExcelFile(file)
  const parsed: ParsedItemRow[] = []

  for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
    parsed.push(parseExcelRow(data[rowIndex] as Record<string, unknown>, rowIndex, godowns))

    if ((rowIndex + 1) % 50 === 0 || rowIndex === data.length - 1) {
      onProgress(Math.round(((rowIndex + 1) / data.length) * 100))
      await new Promise(resolve => setTimeout(resolve, 0))
    }
  }

  return parsed
}

async function executeBulkUpload(validRows: ParsedItemRow[]): Promise<{
  totalImported: number
  totalErrors: number
  allErrors: string[]
  allDebugBlocks: string[]
}> {
  const itemsToUpload = validRows.map((row) => row.data as IItem)
  const CHUNK_SIZE = 250

  let totalImported = 0
  let totalErrors = 0
  const allErrors: string[] = []
  const allDebugBlocks: string[] = []

  for (let i = 0; i < itemsToUpload.length; i += CHUNK_SIZE) {
    const chunk = itemsToUpload.slice(i, i + CHUNK_SIZE)
    const chunkNum = Math.floor(i / CHUNK_SIZE) + 1
    const totalChunks = Math.ceil(itemsToUpload.length / CHUNK_SIZE)

    const result = await processUploadChunk(chunk, chunkNum, totalChunks)
    totalImported += result.imported
    totalErrors += result.failedCount
    allErrors.push(...result.chunkErrors)
    allDebugBlocks.push(...result.debugBlocks)
  }

  return { totalImported, totalErrors, allErrors, allDebugBlocks }
}

function getItemUploadError(error: unknown): string {
  if (error instanceof Error) return error.message
  return "Unknown error"
}

function resetFileInput(ref: React.RefObject<HTMLInputElement | null>): void {
  if (ref.current) ref.current.value = ""
}

type UploadStepPanelProps = {
  readonly isProcessing: boolean
  readonly parseProgress: number
  readonly fileInputRef: React.RefObject<HTMLInputElement | null>
  readonly onDownloadTemplate: () => void
  readonly onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void
}

function UploadStepPanel({ isProcessing, parseProgress, fileInputRef, onDownloadTemplate, onFileUpload }: UploadStepPanelProps) {
  return (
    <div className="space-y-4 mt-4">
      <Alert>
        <AlertCircle className="w-4 h-4" />
        <AlertDescription>
          Download the template, fill in item data, and upload the completed file. You&apos;ll be able to review and
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
        <Button variant="outline" onClick={onDownloadTemplate} className="gap-2 bg-transparent">
          <Download className="w-4 h-4" />
          Download Template
        </Button>

        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={onFileUpload}
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
  )
}

type UploadSummaryResult = {
  finished: boolean
  totalImported: number
  totalErrors: number
  errors: string[]
  debugBlocks: string[]
}

function UploadSummaryAlert({ uploadSummary }: { readonly uploadSummary: UploadSummaryResult | null }) {
  if (!uploadSummary?.finished) return null
  const hasIssues = uploadSummary.totalErrors > 0
  const alertClass = hasIssues
    ? "bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800"
    : "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800"
  const iconClass = hasIssues
    ? "w-4 h-4 text-orange-600 dark:text-orange-400"
    : "w-4 h-4 text-green-600 dark:text-green-400"
  const textClass = hasIssues ? "text-orange-800 dark:text-orange-200" : "text-green-800 dark:text-green-200"
  const hasDetails = uploadSummary.errors.length > 0 || uploadSummary.debugBlocks.length > 0

  return (
    <Alert className={alertClass}>
      <AlertCircle className={iconClass} />
      <AlertDescription className={textClass}>
        <strong>{hasIssues ? "Completed with issues" : "Completed"}:</strong> Updated {uploadSummary.totalImported} items.
        {hasIssues ? ` Errors: ${uploadSummary.totalErrors}.` : ""}
        {hasDetails && (
          <div className="mt-3 space-y-2">
            {uploadSummary.errors.length > 0 && (
              <div>
                <div className="text-sm font-medium">Errors (first {Math.min(20, uploadSummary.errors.length)}):</div>
                <Textarea
                  readOnly
                  value={uploadSummary.errors.slice(0, 20).join("\n")}
                  className="mt-1 font-mono text-xs min-h-24"
                />
              </div>
            )}
            {uploadSummary.debugBlocks.length > 0 && (
              <div>
                <div className="text-sm font-medium">Matching Debug Logs (copy/paste):</div>
                <Textarea
                  readOnly
                  value={uploadSummary.debugBlocks.join("\n\n---\n\n")}
                  className="mt-1 font-mono text-xs min-h-40"
                />
              </div>
            )}
          </div>
        )}
      </AlertDescription>
    </Alert>
  )
}

type ItemUploadRowProps = {
  readonly row: ParsedItemRow
  readonly index: number
  readonly onUpdate: (index: number, field: keyof IItem, value: string | number) => void
  readonly onRemove: (index: number) => void
}

function ItemUploadRow({ row, index, onUpdate, onRemove }: ItemUploadRowProps) {
  return (
    <TableRow className={!row.isValid ? "bg-orange-500/5" : ""}>
      <TableCell className="w-12">
        {row.isValid ? (
          <Check className="w-4 h-4 text-green-600" />
        ) : (
          <div className="group relative">
            <AlertCircle className="w-4 h-4 text-orange-600 cursor-help" />
            <div className="invisible group-hover:visible absolute bottom-full left-0 mb-2 w-max bg-gray-900 text-white text-xs p-3 rounded z-50 max-w-sm">
              <div className="space-y-1">
                {row.errors.map((error, idx) => (
                  <div key={idx} className="whitespace-normal">• {error}</div>
                ))}
              </div>
            </div>
          </div>
        )}
      </TableCell>
      <TableCell className="min-w-[120px]">
        <Input value={row.data.itemCode || ""} onChange={(e) => onUpdate(index, "itemCode", e.target.value)} className="text-sm" placeholder="Item code" />
      </TableCell>
      <TableCell className="min-w-[200px]">
        <Input
          value={row.data.name || ""}
          onChange={(e) => onUpdate(index, "name", e.target.value)}
          className={!row.isValid && row.errors.some((e) => e.includes("name")) ? ERROR_INPUT_CLASS : "text-sm"}
          placeholder="Item name"
        />
      </TableCell>
      <TableCell className="min-w-[180px]">
        <Input value={row.data.description || ""} onChange={(e) => onUpdate(index, "description", e.target.value)} className="text-sm" placeholder="Item description" />
      </TableCell>
      <TableCell className="min-w-[100px]">
        <Input value={row.data.category || ""} onChange={(e) => onUpdate(index, "category", e.target.value)} className="text-sm" placeholder="Category" />
      </TableCell>
      <TableCell className="min-w-[120px]">
        <Input
          value={row.data.hsnCode || ""}
          onChange={(e) => onUpdate(index, "hsnCode", e.target.value)}
          className={!row.isValid && row.errors.some((e) => e.includes("hsnCode")) ? ERROR_INPUT_CLASS : "text-sm"}
          placeholder="HSN"
        />
      </TableCell>
      <TableCell className="min-w-[100px]">
        <Input value={row.data.barcodeNo || ""} onChange={(e) => onUpdate(index, "barcodeNo", e.target.value)} className="text-sm" placeholder="Barcode" />
      </TableCell>
      <TableCell className="min-w-[80px]">
        <Select value={row.data.unit || "PCS"} onValueChange={(value) => onUpdate(index, "unit", value)}>
          <SelectTrigger className={!row.isValid && row.errors.some((e) => e.includes("unit")) ? ERROR_INPUT_CLASS : "text-sm"}>
            <SelectValue placeholder="Unit">{row.data.unit || "PCS"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {VALID_UNITS.map((unit) => (
              <SelectItem key={unit} value={unit}>{unit}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="min-w-[120px]">
        <Input type="number" value={row.data.purchasePrice || 0} onChange={(e) => onUpdate(index, "purchasePrice", Number.parseFloat(e.target.value) || 0)} className="text-sm" placeholder="0" />
      </TableCell>
      <TableCell className="min-w-[120px]">
        <Input type="number" value={row.data.wholesalePrice || 0} onChange={(e) => onUpdate(index, "wholesalePrice", Number.parseFloat(e.target.value) || 0)} className="text-sm" placeholder="0" />
      </TableCell>
      <TableCell className="min-w-[120px]">
        <Input type="number" value={row.data.salePrice || 0} onChange={(e) => onUpdate(index, "salePrice", Number.parseFloat(e.target.value) || 0)} className="text-sm" placeholder="0" />
      </TableCell>
      <TableCell className="min-w-[100px]">
        <Input type="number" value={row.data.stock || 0} onChange={(e) => onUpdate(index, "stock", Number.parseFloat(e.target.value) || 0)} className="text-sm" placeholder="0" />
      </TableCell>
      <TableCell className="min-w-[100px]">
        <Input type="number" value={row.data.minStock || 0} onChange={(e) => onUpdate(index, "minStock", Number.parseFloat(e.target.value) || 0)} className="text-sm" placeholder="0" />
      </TableCell>
      <TableCell className="min-w-[110px]">
        <Input type="number" value={row.data.gstRate || 18} onChange={(e) => onUpdate(index, "gstRate", Number.parseFloat(e.target.value) || 18)} className="text-sm" placeholder="18" />
      </TableCell>
      <TableCell className="min-w-[140px]">
        <Input type="number" value={row.data.perCartonQuantity || ""} onChange={(e) => onUpdate(index, "perCartonQuantity", e.target.value ? Number.parseFloat(e.target.value) : "")} className="text-sm" placeholder="Per carton qty" />
      </TableCell>
      <TableCell className="w-12">
        <Button variant="ghost" size="icon" onClick={() => onRemove(index)}>
          <Trash2 className="w-4 h-4 text-destructive" />
        </Button>
      </TableCell>
    </TableRow>
  )
}

type ConfirmStepPanelProps = {
  readonly uploadSummary: UploadSummaryResult | null
  readonly parsedData: ParsedItemRow[]
  readonly displayedRows: ParsedItemRow[]
  readonly validCount: number
  readonly invalidCount: number
  readonly invalidCountSuffix: string
  readonly validCountSuffix: string
  readonly filterButtonLabel: string
  readonly showOnlyInvalid: boolean
  readonly isProcessing: boolean
  readonly onToggleFilter: () => void
  readonly onAddRow: () => void
  readonly onCancel: () => void
  readonly onConfirmUpload: () => void
  readonly onUpdateRow: (index: number, field: keyof IItem, value: string | number) => void
  readonly onRemoveRow: (index: number) => void
}

function ConfirmStepPanel({
  uploadSummary, parsedData, displayedRows, validCount, invalidCount,
  invalidCountSuffix, validCountSuffix, filterButtonLabel, showOnlyInvalid,
  isProcessing, onToggleFilter, onAddRow, onCancel, onConfirmUpload, onUpdateRow, onRemoveRow,
}: ConfirmStepPanelProps) {
  return (
    <div className="space-y-4 mt-4">
      <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        <AlertDescription className="text-blue-800 dark:text-blue-200">
          <strong>⚙️ Update Fields:</strong> For matched items (by name; category/per-carton only used as tie-breakers), the following fields will be updated:
          <div className="mt-2 ml-4">
            <div>✅ <strong>Item Code</strong></div>
            <div>✅ <strong>Unit</strong> (PCS, KG, LTR, etc.)</div>
            <div>✅ <strong>Description</strong></div>
          </div>
          <div className="mt-2 text-sm italic">Note: This is a temporary modification. Other fields will be updatable in future versions.</div>
        </AlertDescription>
      </Alert>

      <UploadSummaryAlert uploadSummary={uploadSummary} />

      <div className="flex gap-3 items-center">
        <Badge variant="secondary" className="bg-green-500/10 text-green-700 dark:text-green-400 text-base px-4 py-2">
          <Check className="w-4 h-4 mr-2" />
          {validCount} Valid
        </Badge>
        {invalidCount > 0 && (
          <Badge variant="secondary" className="bg-orange-500/10 text-orange-700 dark:text-orange-400 text-base px-4 py-2">
            <AlertCircle className="w-4 h-4 mr-2" />
            {invalidCount} Invalid
          </Badge>
        )}
        <div className="ml-auto text-sm text-muted-foreground">
          Showing {parsedData.length} of {parsedData.length} records
        </div>
      </div>

      {invalidCount > 0 && (
        <div className="flex items-center gap-3">
          <Button variant={showOnlyInvalid ? "default" : "outline"} size="sm" onClick={onToggleFilter} className="gap-2">
            <AlertCircle className="w-4 h-4" />
            {filterButtonLabel}
          </Button>
          {showOnlyInvalid && (
            <span className="text-sm text-orange-600 dark:text-orange-400">
              Filtered to show {invalidCount} invalid record{invalidCountSuffix}
            </span>
          )}
        </div>
      )}

      {invalidCount > 0 && (
        <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            <strong>Tip:</strong> Hover over the error icon (⊙) next to invalid rows to see what&apos;s missing or incorrect. Common issues: empty item name, invalid unit, or missing prices.
          </AlertDescription>
        </Alert>
      )}

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
              {displayedRows.map((row, index) => (
                <ItemUploadRow key={index} row={row} index={index} onUpdate={onUpdateRow} onRemove={onRemoveRow} />
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Button variant="outline" onClick={onAddRow} className="gap-2 bg-transparent">
        <Plus className="w-4 h-4" />
        Add Row
      </Button>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onCancel} disabled={isProcessing}>
          Cancel
        </Button>
        <Button onClick={onConfirmUpload} disabled={isProcessing || validCount === 0} className="gap-2">
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              Upload {validCount} Item{validCountSuffix}
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

export function ItemUploadBtn({ godowns }: { godowns: Array<{ id: string; name: string }> }) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<UploadStep>("upload")
  const [isProcessing, setIsProcessing] = useState(false)
  const [parsedData, setParsedData] = useState<ParsedItemRow[]>([])
  const [parseProgress, setParseProgress] = useState(0)
  const [showOnlyInvalid, setShowOnlyInvalid] = useState(false)
  const [uploadSummary, setUploadSummary] = useState<UploadSummaryResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const updateRow = (index: number, field: keyof IItem, value: string | number) => {
    setParsedData((prev) => {
      const newData = [...prev]
      const updatedData = { ...newData[index].data, [field]: value }
      updatedData.unit = normalizeUnit(String(updatedData.unit || ""))
      updatedData.packagingUnit = normalizePackagingUnit(String(updatedData.packagingUnit || "CTN"))
      const result = validateRowData(updatedData)
      newData[index] = { data: updatedData, errors: result.errors, isValid: result.isValid }
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
          id: "", itemCode: "", name: "", category: "", hsnCode: "", barcodeNo: "",
          unit: "PCS", packagingUnit: "CTN", conversionRate: 1, alternateUnit: "",
          purchasePrice: 0, salePrice: 0, wholesalePrice: 0, quantityPrice: 0, mrp: 0,
          discountType: "percentage", saleDiscount: 0, stock: 0, minStock: 0, maxStock: 0,
          itemLocation: "", perCartonQuantity: 1, godownId: null,
          gstRate: 18, taxRate: 18, cessRate: 0, inclusiveOfTax: true,
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
      const parsed = await parseFileToRows(file, godowns, setParseProgress)
      setParsedData(parsed)
      setStep("confirm")
      toast.success(`Parsed ${parsed.length} records. Please review before submitting.`)
    } catch {
      toast.error("Failed to parse Excel file")
    } finally {
      setIsProcessing(false)
      setParseProgress(0)
      resetFileInput(fileInputRef)
    }
  }

  const handleConfirmUpload = async () => {
    const validRows = parsedData.filter((row) => row.isValid)
    if (validRows.length === 0) {
      toast.error("No valid records to upload")
      return
    }
    setIsProcessing(true)
    setUploadSummary(null)
    try {
      const result = await executeBulkUpload(validRows)
      showFinalImportToast(result.totalImported, result.totalErrors, validRows.length, result.allErrors)
      setUploadSummary({ finished: true, totalImported: result.totalImported, totalErrors: result.totalErrors, errors: result.allErrors, debugBlocks: result.allDebugBlocks })
    } catch (error) {
      const errorMsg = getItemUploadError(error)
      console.error("Upload process error:", error)
      toast.error(`Upload failed: ${errorMsg}`)
      setUploadSummary({ finished: true, totalImported: 0, totalErrors: 1, errors: [errorMsg], debugBlocks: [] })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCancel = () => {
    setOpen(false)
    setStep("upload")
    setParsedData([])
    setUploadSummary(null)
  }

  const validCount = parsedData.filter((row) => row.isValid).length
  const invalidCount = parsedData.length - validCount
  const displayedRows = showOnlyInvalid ? parsedData.filter(row => !row.isValid) : parsedData
  const invalidCountSuffix = invalidCount !== 1 ? "s" : ""
  const validCountSuffix = validCount !== 1 ? "s" : ""
  const filterButtonLabel = showOnlyInvalid ? `Show Only Invalid (${invalidCount})` : `Show All (${parsedData.length})`

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="gap-2">
        <Upload className="w-4 h-4" />
        Bulk Upload
      </Button>

      <Dialog open={open} onOpenChange={(v) => { if (!v && !isProcessing) handleCancel() }}>
        <DialogContent className="!max-w-[95vw] sm:!max-w-[95vw] w-full h-auto max-h-[90vh] overflow-y-auto p-6" onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{step === "upload" ? "Bulk Upload Items" : "Review & Confirm Upload"}</DialogTitle>
          </DialogHeader>

          {step === "upload" ? (
            <UploadStepPanel
              isProcessing={isProcessing}
              parseProgress={parseProgress}
              fileInputRef={fileInputRef}
              onDownloadTemplate={handleDownloadTemplate}
              onFileUpload={handleFileUpload}
            />
          ) : (
            <ConfirmStepPanel
              uploadSummary={uploadSummary}
              parsedData={parsedData}
              displayedRows={displayedRows}
              validCount={validCount}
              invalidCount={invalidCount}
              invalidCountSuffix={invalidCountSuffix}
              validCountSuffix={validCountSuffix}
              filterButtonLabel={filterButtonLabel}
              showOnlyInvalid={showOnlyInvalid}
              isProcessing={isProcessing}
              onToggleFilter={() => setShowOnlyInvalid(!showOnlyInvalid)}
              onAddRow={addRow}
              onCancel={handleCancel}
              onConfirmUpload={handleConfirmUpload}
              onUpdateRow={updateRow}
              onRemoveRow={removeRow}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
