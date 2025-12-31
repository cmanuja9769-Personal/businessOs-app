"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Upload, Download, AlertCircle, Loader2, Trash2, Plus, Check } from "lucide-react"
import { parseExcelFile, downloadCustomerExcelTemplate } from "@/lib/excel-parser"
import { customerSchema } from "@/lib/schemas"
import { bulkImportCustomers } from "@/app/customers/actions"
import { toast } from "sonner"
import type { ICustomer } from "@/types"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

type UploadStep = "upload" | "confirm"

interface ParsedCustomerRow {
  data: Partial<ICustomer>
  errors: string[]
  isValid: boolean
}

export function CustomerUploadBtn() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<UploadStep>("upload")
  const [isProcessing, setIsProcessing] = useState(false)
  const [parsedData, setParsedData] = useState<ParsedCustomerRow[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const updateRow = (index: number, field: keyof ICustomer, value: string | number) => {
    setParsedData((prev) => {
      const newData = [...prev]
      newData[index].data = { ...newData[index].data, [field]: value }

      // Revalidate the row
      try {
        customerSchema.parse({
          name: newData[index].data.name,
          contactNo: newData[index].data.contactNo?.toString(),
          email: newData[index].data.email || "",
          address: newData[index].data.address || "",
          openingBalance: Number(newData[index].data.openingBalance) || 0,
          openingDate: newData[index].data.openingDate || new Date(),
          gstinNo: newData[index].data.gstinNo?.toString() || "",
        })
        newData[index].errors = []
        newData[index].isValid = true
      } catch (error: unknown) {
        if (error && typeof error === "object" && "errors" in error) {
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
          name: "",
          contactNo: "",
          email: "",
          address: "",
          openingBalance: 0,
          openingDate: new Date(),
          gstinNo: "",
        },
        errors: ["name: Required", "contactNo: Required"],
        isValid: false,
      },
    ])
  }

  const handleDownloadTemplate = () => {
    void downloadCustomerExcelTemplate("customer_template.xlsx")
    toast.success("Template downloaded successfully")
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsProcessing(true)

    try {
      const data = await parseExcelFile(file)
      const parsed: ParsedCustomerRow[] = []

      data.forEach((row, index) => {
        try {
          const validated = customerSchema.parse({
            name: row.name,
            contactNo: row.contactNo?.toString(),
            email: row.email || "",
            address: row.address || "",
            openingBalance: Number(row.openingBalance) || 0,
            openingDate: row.openingDate ? new Date(row.openingDate) : new Date(),
            gstinNo: row.gstinNo?.toString() || "",
          })

          parsed.push({
            data: {
              id: `CUST-${Date.now()}-${index}`,
              ...validated,
              email: validated.email || undefined,
              address: validated.address || undefined,
              gstinNo: validated.gstinNo || undefined,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            errors: [],
            isValid: true,
          })
        } catch (error: unknown) {
          if (error && typeof error === "object" && "errors" in error) {
            const zodError = error as { errors: { path: string[]; message: string }[] }
            parsed.push({
              data: {
                name: String(row.name || ""),
                contactNo: String(row.contactNo || ""),
                email: String(row.email || ""),
                address: String(row.address || ""),
                openingBalance: Number(row.openingBalance) || 0,
                openingDate: row.openingDate ? new Date(row.openingDate) : new Date(),
                gstinNo: row.gstinNo?.toString() || "",
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
      await bulkImportCustomers(validRows.map((row) => row.data as ICustomer))
      toast.success(`Successfully imported ${validRows.length} customers`)
      setOpen(false)
      setStep("upload")
      setParsedData([])
    } catch (error) {
      toast.error("Failed to import customers")
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
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{step === "upload" ? "Bulk Upload Customers" : "Review & Confirm Upload"}</DialogTitle>
          </DialogHeader>

          {step === "upload" ? (
            <div className="space-y-4 mt-4">
              <Alert>
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>
                  Download the template, fill in customer data, and upload the completed file. You'll be able to review
                  and modify all records before submitting.
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
                    id="customer-upload"
                  />
                  <Button asChild variant="default" disabled={isProcessing} className="gap-2">
                    <label htmlFor="customer-upload" className="cursor-pointer">
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

              {/* Data Table */}
              <div className="border rounded-lg max-h-125 overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="w-12">Status</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Contact No</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>GSTIN</TableHead>
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
                              !row.isValid && row.errors.some((e) => e.includes("name")) ? "border-orange-500" : ""
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={row.data.contactNo || ""}
                            onChange={(e) => updateRow(index, "contactNo", e.target.value)}
                            className={
                              !row.isValid && row.errors.some((e) => e.includes("contactNo")) ? "border-orange-500" : ""
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={row.data.email || ""}
                            onChange={(e) => updateRow(index, "email", e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={row.data.address || ""}
                            onChange={(e) => updateRow(index, "address", e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={row.data.openingBalance || 0}
                            onChange={(e) => updateRow(index, "openingBalance", Number.parseFloat(e.target.value) || 0)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={row.data.gstinNo || ""}
                            onChange={(e) => updateRow(index, "gstinNo", e.target.value)}
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
                      Upload {validCount} Customer{validCount !== 1 ? "s" : ""}
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
