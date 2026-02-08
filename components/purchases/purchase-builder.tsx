"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Save, ShoppingCart, Loader2, Plus, Trash2 } from "lucide-react"
import { createPurchase, generatePurchaseNumber } from "@/app/purchases/actions"
import { getSuppliers } from "@/app/suppliers/actions"
import { getItems } from "@/app/items/actions"
import { toast } from "sonner"
import type { ISupplier, IItem, IPurchaseItem } from "@/types"
import { ItemSelect } from "@/components/items/item-select"

export function PurchaseBuilder() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [suppliers, setSuppliers] = useState<ISupplier[]>([])
  const [items, setItems] = useState<IItem[]>([])

  const [purchaseNo, setPurchaseNo] = useState("")
  const [selectedSupplier, setSelectedSupplier] = useState<ISupplier | null>(null)
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split("T")[0])
  const [gstEnabled, setGstEnabled] = useState(true)
  const [purchaseItems, setPurchaseItems] = useState<IPurchaseItem[]>([])
  const [notes, setNotes] = useState("")

  useEffect(() => {
    async function loadData() {
      try {
        const [suppliersData, itemsData, purchaseNumber] = await Promise.all([
          getSuppliers(),
          getItems(),
          generatePurchaseNumber(),
        ])
        setSuppliers(suppliersData)
        setItems(itemsData)
        setPurchaseNo(purchaseNumber)
      } catch {
        toast.error("Failed to load data")
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  const addItem = () => {
    setPurchaseItems([
      ...purchaseItems,
      {
        itemId: "",
        name: "",
        hsn: "",
        quantity: 1,
        rate: 0,
        discount: 0,
        discountType: "percentage",
        taxRate: 18,
        amount: 0,
      },
    ])
  }

  const updateItem = (index: number, field: keyof IPurchaseItem, value: IPurchaseItem[keyof IPurchaseItem]) => {
    const updated = [...purchaseItems]
    updated[index] = { ...updated[index], [field]: value }

    if (field === "itemId") {
      const selectedItem = items.find((item) => item.id === value)
      if (selectedItem) {
        updated[index].name = selectedItem.name
        updated[index].hsn = selectedItem.hsnCode || ""
        updated[index].rate = selectedItem.purchasePrice
        updated[index].taxRate = selectedItem.taxRate || selectedItem.gstRate
      }
    }

    if (field === "quantity" || field === "rate" || field === "discount" || field === "discountType") {
      const item = updated[index]
      const baseAmount = item.quantity * item.rate
      const discountAmount = item.discountType === "percentage" ? (baseAmount * item.discount) / 100 : item.discount
      updated[index].amount = baseAmount - discountAmount
    }

    setPurchaseItems(updated)
  }

  const removeItem = (index: number) => {
    setPurchaseItems(purchaseItems.filter((_, i) => i !== index))
  }

  const calculateTotals = () => {
    const subtotal = purchaseItems.reduce((sum, item) => sum + item.amount, 0)
    const cgst = gstEnabled ? purchaseItems.reduce((sum, item) => sum + (item.amount * item.taxRate) / 200, 0) : 0
    const sgst = cgst
    const total = subtotal + cgst + sgst

    return { subtotal, cgst, sgst, total }
  }

  const totals = calculateTotals()

  const handleSave = async () => {
    if (!selectedSupplier) {
      toast.error("Please select a supplier")
      return
    }

    if (purchaseItems.length === 0) {
      toast.error("Please add at least one item")
      return
    }

    setIsSaving(true)
    try {
      const purchaseData = {
        purchaseNo,
        supplierId: selectedSupplier.id,
        supplierName: selectedSupplier.name,
        supplierPhone: selectedSupplier.contactNo,
        supplierAddress: selectedSupplier.address,
        supplierGst: selectedSupplier.gstinNo,
        date: new Date(purchaseDate),
        items: purchaseItems,
        subtotal: totals.subtotal,
        discount: 0,
        discountType: "percentage" as const,
        cgst: totals.cgst,
        sgst: totals.sgst,
        igst: 0,
        total: totals.total,
        paidAmount: 0,
        balance: totals.total,
        status: "unpaid" as const,
        gstEnabled,
        notes,
      }

      await createPurchase(purchaseData)
      toast.success("Purchase order created successfully")
      router.push("/purchases")
    } catch {
      toast.error("Failed to save purchase")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Purchase Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>PO Number</Label>
              <Input value={purchaseNo} disabled className="font-mono" />
            </div>
            <div className="space-y-2">
              <Label>Purchase Date</Label>
              <Input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>GST Billing</Label>
              <Select value={gstEnabled ? "gst" : "non-gst"} onValueChange={(v) => setGstEnabled(v === "gst")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gst">GST</SelectItem>
                  <SelectItem value="non-gst">Non-GST</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Supplier *</Label>
            <Select
              value={selectedSupplier?.id || ""}
              onValueChange={(value) => {
                const supplier = suppliers.find((s) => s.id === value)
                setSelectedSupplier(supplier || null)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a supplier" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name} - {supplier.contactNo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedSupplier && (
            <div className="p-4 bg-muted rounded-lg space-y-1 text-sm">
              <p>
                <span className="font-medium">Phone:</span> {selectedSupplier.contactNo}
              </p>
              {selectedSupplier.address && (
                <p>
                  <span className="font-medium">Address:</span> {selectedSupplier.address}
                </p>
              )}
              {selectedSupplier.gstinNo && (
                <p>
                  <span className="font-medium">GSTIN:</span> {selectedSupplier.gstinNo}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Line Items</CardTitle>
            <Button onClick={addItem} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">Item</TableHead>
                  <TableHead className="w-[100px]">HSN</TableHead>
                  <TableHead className="w-[100px]">Qty</TableHead>
                  <TableHead className="w-[120px]">Rate</TableHead>
                  <TableHead className="w-[120px]">Discount</TableHead>
                  <TableHead className="w-[100px]">Tax %</TableHead>
                  <TableHead className="w-[120px]">Amount</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchaseItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No items added. Click &quot;Add Item&quot; to start.
                    </TableCell>
                  </TableRow>
                ) : (
                  purchaseItems.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <ItemSelect
                          items={items}
                          value={item.itemId}
                          onValueChange={(value) => updateItem(index, "itemId", value)}
                          placeholder="Select item"
                        />
                      </TableCell>
                      <TableCell>
                        <Input value={item.hsn} disabled className="text-xs" />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, "quantity", Number(e.target.value))}
                          min="1"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.rate}
                          onChange={(e) => updateItem(index, "rate", Number(e.target.value))}
                          min="0"
                          step="0.01"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Input
                            type="number"
                            value={item.discount}
                            onChange={(e) => updateItem(index, "discount", Number(e.target.value))}
                            min="0"
                            step="0.01"
                            className="w-20"
                          />
                          <Select
                            value={item.discountType}
                            onValueChange={(value) => updateItem(index, "discountType", value)}
                          >
                            <SelectTrigger className="w-16">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="percentage">%</SelectItem>
                              <SelectItem value="flat">₹</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.taxRate}
                          onChange={(e) => updateItem(index, "taxRate", Number(e.target.value))}
                          min="0"
                          max="100"
                          step="0.01"
                        />
                      </TableCell>
                      <TableCell className="font-semibold">₹{item.amount.toFixed(2)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => removeItem(index)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="notes">Notes / Terms & Conditions</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any additional notes or terms..."
                rows={4}
              />
            </div>

            <div className="space-y-3 bg-muted/50 p-4 rounded-lg">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="font-medium">₹{totals.subtotal.toFixed(2)}</span>
              </div>
              {gstEnabled && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">CGST:</span>
                    <span className="font-medium">₹{totals.cgst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">SGST:</span>
                    <span className="font-medium">₹{totals.sgst.toFixed(2)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between text-lg font-bold pt-3 border-t border-border">
                <span>Total Amount:</span>
                <span className="text-primary">₹{totals.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => router.push("/purchases")} disabled={isSaving}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Create Purchase
        </Button>
      </div>
    </div>
  )
}
