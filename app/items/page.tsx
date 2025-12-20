import { getItems } from "./actions"
import { ItemForm } from "@/components/items/item-form"
import { ItemUploadBtn } from "@/components/items/item-upload-btn"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Search, Edit, Package, Barcode, AlertTriangle } from "lucide-react"
import { DeleteItemButton } from "@/components/items/delete-item-button"
import Link from "next/link"

export default async function ItemsPage() {
  const items = await getItems()

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Items & Inventory</h1>
          <p className="text-muted-foreground mt-1">Manage your product catalog and stock levels</p>
        </div>
        <div className="flex gap-3">
          <ItemUploadBtn />
          <ItemForm />
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              All Items ({items.length})
            </CardTitle>
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input type="search" placeholder="Search items..." className="pl-9" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No items yet</h3>
              <p className="text-muted-foreground mb-4">Get started by adding your first item</p>
              <ItemForm />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Name</TableHead>
                  <TableHead>HSN Code</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Purchase Price</TableHead>
                  <TableHead>Sale Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>GST Rate</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const stockStatus =
                    item.stock <= item.minStock ? "low" : item.stock >= item.maxStock ? "high" : "normal"

                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="font-mono text-xs">{item.hsnCode}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.unit}</Badge>
                      </TableCell>
                      <TableCell>₹{item.purchasePrice.toFixed(2)}</TableCell>
                      <TableCell className="font-semibold">₹{item.salePrice.toFixed(2)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{item.stock}</span>
                          {stockStatus === "low" && <AlertTriangle className="w-4 h-4 text-orange-500" />}
                        </div>
                      </TableCell>
                      <TableCell>{item.gstRate}%</TableCell>
                      <TableCell>
                        {stockStatus === "low" ? (
                          <Badge variant="destructive" className="bg-orange-500 text-background">
                            Low Stock
                          </Badge>
                        ) : stockStatus === "high" ? (
                          <Badge variant="secondary">Overstock</Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-green-500/10 text-green-700 dark:text-green-400">
                            In Stock
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/items/barcode/${item.id}`}>
                            <Button variant="ghost" size="icon" title="Print Barcode">
                              <Barcode className="w-4 h-4" />
                            </Button>
                          </Link>
                          <ItemForm
                            item={item}
                            trigger={
                              <Button variant="ghost" size="icon">
                                <Edit className="w-4 h-4" />
                              </Button>
                            }
                          />
                          <DeleteItemButton itemId={item.id} />
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
