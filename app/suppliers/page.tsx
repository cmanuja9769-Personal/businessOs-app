import { getSuppliers } from "./actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus, Mail, Phone, MapPin, Truck } from "lucide-react"
import { SupplierForm } from "@/components/suppliers/supplier-form"
import { DeleteSupplierButton } from "@/components/suppliers/delete-supplier-button"

export default async function SuppliersPage() {
  const suppliers = await getSuppliers()

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Suppliers</h1>
          <p className="text-muted-foreground">Manage your suppliers and vendor information</p>
        </div>
        <SupplierForm>
          <Button className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Add Supplier
          </Button>
        </SupplierForm>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5" />
            <span className="hidden sm:inline">All Suppliers</span>
            <span className="sm:hidden">Suppliers</span>
          </CardTitle>
          <CardDescription>A list of all your suppliers with their contact details</CardDescription>
        </CardHeader>
        <CardContent>
          {suppliers.length === 0 ? (
            <div className="text-center py-12">
              <Truck className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">No suppliers yet</h3>
              <p className="text-muted-foreground mt-2">Get started by adding your first supplier</p>
              <SupplierForm>
                <Button className="mt-4">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Supplier
                </Button>
              </SupplierForm>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>GSTIN</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell className="font-medium">{supplier.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-sm">
                        <div className="flex items-center gap-2">
                          <Phone className="w-3 h-3 text-muted-foreground" />
                          <span>{supplier.contactNo}</span>
                        </div>
                        {supplier.email && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Mail className="w-3 h-3" />
                            <span>{supplier.email}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {supplier.address ? (
                        <div className="flex items-start gap-2 text-sm max-w-xs">
                          <MapPin className="w-3 h-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <span className="line-clamp-2">{supplier.address}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {supplier.gstinNo ? (
                        <Badge variant="outline" className="font-mono text-xs">
                          {supplier.gstinNo}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <SupplierForm supplier={supplier}>
                          <Button variant="outline" size="sm">
                            Edit
                          </Button>
                        </SupplierForm>
                        <DeleteSupplierButton id={supplier.id} name={supplier.name} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
