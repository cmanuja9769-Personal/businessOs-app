"use client"

import { useState } from "react"
import Link from "next/link"
import type { IItem, IItemWarehouseStock, IStockLedgerEntry, IItemInvoiceUsage } from "@/types"
import { PACKAGING_UNITS } from "@/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  ArrowLeft, 
  Package, 
  Warehouse, 
  History, 
  FileText, 
  Barcode,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Edit,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw
} from "lucide-react"
import { ItemForm } from "@/components/items/item-form"
import { AddStockDialog } from "@/components/items/add-stock-dialog"
import { format } from "date-fns"

interface ItemDetailsClientProps {
  item: IItem & { openingStock?: number }
  godowns: Array<{ id: string; name: string }>
  stockDistribution: Array<{
    id: string
    warehouseId: string
    warehouseName: string
    quantity: number
    minQuantity: number
    maxQuantity: number
    location: string
  }>
  stockLedger: Array<{
    id: string
    transactionType: string
    transactionDate: Date
    quantityBefore: number
    quantityChange: number
    quantityAfter: number
    entryQuantity: number
    entryUnit: string
    baseQuantity: number
    ratePerUnit?: number
    totalValue?: number
    referenceType?: string
    referenceId?: string
    referenceNo: string
    partyName: string
    warehouseName: string
    notes: string
  }>
  invoiceUsage: Array<{
    invoiceId: string
    invoiceNo: string
    documentType: string
    invoiceDate: Date
    customerName: string
    quantity: number
    unit: string
    rate: number
    amount: number
  }>
}

const transactionTypeConfig: Record<string, { label: string; color: string; icon: typeof TrendingUp }> = {
  IN: { label: "Stock In", color: "bg-green-100 text-green-800", icon: TrendingUp },
  OUT: { label: "Stock Out", color: "bg-red-100 text-red-800", icon: TrendingDown },
  SALE: { label: "Sale", color: "bg-blue-100 text-blue-800", icon: ArrowDownRight },
  PURCHASE: { label: "Purchase", color: "bg-emerald-100 text-emerald-800", icon: ArrowUpRight },
  ADJUSTMENT: { label: "Adjustment", color: "bg-yellow-100 text-yellow-800", icon: RefreshCw },
  RETURN: { label: "Return", color: "bg-purple-100 text-purple-800", icon: RefreshCw },
  TRANSFER_IN: { label: "Transfer In", color: "bg-cyan-100 text-cyan-800", icon: ArrowUpRight },
  TRANSFER_OUT: { label: "Transfer Out", color: "bg-orange-100 text-orange-800", icon: ArrowDownRight },
  OPENING: { label: "Opening", color: "bg-gray-100 text-gray-800", icon: Package },
  CORRECTION: { label: "Correction", color: "bg-pink-100 text-pink-800", icon: RefreshCw },
}

export function ItemDetailsClient({
  item,
  godowns,
  stockDistribution,
  stockLedger,
  invoiceUsage,
}: ItemDetailsClientProps) {
  const [activeTab, setActiveTab] = useState("overview")

  const stockStatus = item.stock <= item.minStock ? "low" : item.stock >= item.maxStock ? "high" : "normal"
  const totalQuantitySold = invoiceUsage.reduce((sum, inv) => sum + inv.quantity, 0)
  const totalRevenue = invoiceUsage.reduce((sum, inv) => sum + inv.amount, 0)

  // Stock is now stored in packaging units (CTN, BAG, etc.)
  // Calculate equivalent base units for display
  const packagingUnit = item.packagingUnit || "CTN"
  const baseUnit = item.unit || "PCS"
  const perPackaging = item.perCartonQuantity || 1
  const baseUnitsTotal = item.stock * perPackaging

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/items">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{item.name}</h1>
              {stockStatus === "low" && (
                <Badge variant="destructive" className="bg-orange-500">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Low Stock
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              {item.itemCode && <span className="font-mono">{item.itemCode}</span>}
              {item.category && <span className="mx-2">•</span>}
              {item.category && <span>{item.category}</span>}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <AddStockDialog item={item} godowns={godowns} />
          <ItemForm 
            item={item} 
            godowns={godowns}
            trigger={
              <Button variant="outline">
                <Edit className="w-4 h-4 mr-2" />
                Edit Item
              </Button>
            }
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Stock</CardDescription>
            <CardTitle className="text-3xl">
              {item.stock.toLocaleString()} <span className="text-lg font-normal text-muted-foreground">{packagingUnit}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {perPackaging > 1 && (
              <p className="text-sm text-muted-foreground">
                = {baseUnitsTotal.toLocaleString()} {baseUnit}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Packaging</CardDescription>
            <CardTitle className="text-xl">
              1 {packagingUnit} = {perPackaging} {baseUnit}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Master packaging configuration
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Sold</CardDescription>
            <CardTitle className="text-3xl">
              {totalQuantitySold.toLocaleString()} <span className="text-lg font-normal text-muted-foreground">{baseUnit}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Across {invoiceUsage.length} invoices
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Revenue Generated</CardDescription>
            <CardTitle className="text-3xl">₹{totalRevenue.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Avg. rate: ₹{totalQuantitySold > 0 ? (totalRevenue / totalQuantitySold).toFixed(2) : item.salePrice.toFixed(2)}/{item.unit}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview" className="gap-2">
            <Package className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="distribution" className="gap-2">
            <Warehouse className="w-4 h-4" />
            Stock Distribution
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="w-4 h-4" />
            Stock History
          </TabsTrigger>
          <TabsTrigger value="invoices" className="gap-2">
            <FileText className="w-4 h-4" />
            Invoice Usage
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Item Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Item Code</p>
                    <p className="font-medium font-mono">{item.itemCode || "-"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">HSN Code</p>
                    <p className="font-medium font-mono">{item.hsnCode || "-"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Category</p>
                    <p className="font-medium">{item.category || "-"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Base Unit</p>
                    <p className="font-medium">{item.unit}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Packaging Unit</p>
                    <p className="font-medium">{item.packagingUnit || "CTN"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Per {item.packagingUnit || "CTN"} Qty</p>
                    <p className="font-medium">{item.perCartonQuantity || 1} {item.unit}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Location</p>
                    <p className="font-medium">{item.itemLocation || "-"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Warehouses</p>
                    <p className="font-medium">
                      {stockDistribution.length > 0 
                        ? `${stockDistribution.length} location${stockDistribution.length > 1 ? 's' : ''}`
                        : "No distribution"
                      }
                    </p>
                  </div>
                </div>
                {item.description && (
                  <div className="pt-2 border-t">
                    <p className="text-muted-foreground text-sm">Description</p>
                    <p className="text-sm">{item.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-lg">₹</span>
                  Pricing & Tax
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Purchase Price</p>
                    <p className="font-medium">₹{item.purchasePrice.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Sale Price</p>
                    <p className="font-semibold text-primary">₹{item.salePrice.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Wholesale Price</p>
                    <p className="font-medium">₹{(item.wholesalePrice || 0).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Quantity Price</p>
                    <p className="font-medium">₹{(item.quantityPrice || 0).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">GST Rate</p>
                    <p className="font-medium">{item.gstRate}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Tax Inclusive</p>
                    <p className="font-medium">{item.inclusiveOfTax ? "Yes" : "No"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Discount Type</p>
                    <p className="font-medium capitalize">{item.discountType || "Percentage"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Default Discount</p>
                    <p className="font-medium">
                      {item.saleDiscount || 0}
                      {item.discountType === "flat" ? "₹" : "%"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Barcode className="w-5 h-5" />
                  Barcode
                </CardTitle>
              </CardHeader>
              <CardContent>
                {item.barcodeNo ? (
                  <div className="space-y-2">
                    <p className="font-mono text-lg">{item.barcodeNo}</p>
                    <Link href={`/items/barcode/${item.id}`}>
                      <Button variant="outline" size="sm">
                        View & Print Barcode
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No barcode assigned</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Stock Levels
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Current</p>
                    <p className="font-semibold text-lg">{item.stock}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Minimum</p>
                    <p className="font-medium">{item.minStock}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Opening</p>
                    <p className="font-medium">{item.openingStock || item.stock}</p>
                  </div>
                </div>
                {stockStatus === "low" && (
                  <div className="mt-4 p-2 bg-orange-50 rounded-md flex items-center gap-2 text-orange-800">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-sm">Stock is below minimum level</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Stock Distribution Tab */}
        <TabsContent value="distribution" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Warehouse className="w-5 h-5" />
                Stock by Godown
              </CardTitle>
              <CardDescription>
                View stock distribution across all warehouses
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stockDistribution.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Warehouse className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No warehouse stock records found</p>
                  <p className="text-sm">Stock is being tracked at item level only</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Warehouse</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead className="text-right">Quantity ({item.unit})</TableHead>
                      <TableHead className="text-right">In {item.packagingUnit || "CTN"}</TableHead>
                      <TableHead className="text-right">Min Qty</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stockDistribution.map((stock) => {
                      const inPackaging = item.perCartonQuantity && item.perCartonQuantity > 1
                        ? Math.floor(stock.quantity / item.perCartonQuantity)
                        : stock.quantity
                      const isLow = stock.quantity <= stock.minQuantity
                      return (
                        <TableRow key={stock.id}>
                          <TableCell className="font-medium">{stock.warehouseName}</TableCell>
                          <TableCell>{stock.location || "-"}</TableCell>
                          <TableCell className="text-right font-mono">{stock.quantity.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-mono">{inPackaging.toLocaleString()}</TableCell>
                          <TableCell className="text-right">{stock.minQuantity}</TableCell>
                          <TableCell>
                            {isLow ? (
                              <Badge variant="destructive" className="bg-orange-500">Low</Badge>
                            ) : (
                              <Badge variant="outline" className="text-green-600">OK</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stock History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                Stock Movement History
              </CardTitle>
              <CardDescription>
                Complete audit trail of all stock movements
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stockLedger.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No stock movement history found</p>
                  <p className="text-sm">Movements will appear here after running the migration</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Warehouse</TableHead>
                      <TableHead className="text-right">Change</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stockLedger.map((entry) => {
                      const config = transactionTypeConfig[entry.transactionType] || transactionTypeConfig.ADJUSTMENT
                      const Icon = config.icon
                      return (
                        <TableRow key={entry.id}>
                          <TableCell className="text-sm">
                            {format(entry.transactionDate, "dd MMM yyyy")}
                            <br />
                            <span className="text-muted-foreground text-xs">
                              {format(entry.transactionDate, "HH:mm")}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge className={config.color} variant="secondary">
                              <Icon className="w-3 h-3 mr-1" />
                              {config.label}
                            </Badge>
                          </TableCell>
                          <TableCell>{entry.warehouseName || "-"}</TableCell>
                          <TableCell className="text-right font-mono">
                            <span className={entry.quantityChange >= 0 ? "text-green-600" : "text-red-600"}>
                              {entry.quantityChange >= 0 ? "+" : ""}{entry.quantityChange}
                            </span>
                            {entry.entryUnit !== item.unit && (
                              <span className="text-xs text-muted-foreground block">
                                ({entry.entryQuantity} {entry.entryUnit})
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono">{entry.quantityAfter}</TableCell>
                          <TableCell>
                            {entry.referenceNo ? (
                              <span className="font-mono text-sm">{entry.referenceNo}</span>
                            ) : "-"}
                            {entry.partyName && (
                              <span className="text-muted-foreground text-xs block">{entry.partyName}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                            {entry.notes || "-"}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoice Usage Tab */}
        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Invoice Usage
              </CardTitle>
              <CardDescription>
                Invoices where this item was sold
              </CardDescription>
            </CardHeader>
            <CardContent>
              {invoiceUsage.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No invoices found with this item</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoiceUsage.map((usage) => (
                      <TableRow key={usage.invoiceId}>
                        <TableCell>
                          <Link 
                            href={`/invoices/${usage.invoiceId}`}
                            className="font-mono text-primary hover:underline"
                          >
                            {usage.invoiceNo}
                          </Link>
                        </TableCell>
                        <TableCell>{format(usage.invoiceDate, "dd MMM yyyy")}</TableCell>
                        <TableCell>{usage.customerName}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {usage.documentType.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {usage.quantity} {usage.unit}
                        </TableCell>
                        <TableCell className="text-right">₹{usage.rate.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-medium">₹{usage.amount.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
