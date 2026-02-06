import { getSuppliers } from "./actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/ui/page-header"
import { DataEmptyState } from "@/components/ui/data-empty-state"
import { CardTitleWithCount } from "@/components/ui/card-title-with-count"
import { Plus, Mail, Phone, MapPin, Truck } from "lucide-react"
import { SupplierForm } from "@/components/suppliers/supplier-form"
import { DeleteSupplierButton } from "@/components/suppliers/delete-supplier-button"

export default async function SuppliersPage() {
  const suppliers = await getSuppliers()

  return (
    <div className="px-4 sm:px-6 py-3 sm:py-4 space-y-3 sm:space-y-4 h-full flex flex-col overflow-hidden">
      <PageHeader
        title="Suppliers"
        description="Manage your suppliers and vendor information"
        actions={
          <SupplierForm>
            <Button className="w-full sm:w-auto h-9 text-sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Supplier
            </Button>
          </SupplierForm>
        }
      />

      <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <CardHeader className="py-3 px-4 shrink-0">
          <CardTitleWithCount
            icon={Truck}
            title="All Suppliers"
            mobileTitle="Suppliers"
            count={suppliers.length}
          />
        </CardHeader>
        <CardContent className="flex-1 min-h-0 overflow-hidden px-4 pb-4 pt-0">
          {suppliers.length === 0 ? (
            <DataEmptyState
              icon={Truck}
              title="No suppliers yet"
              description="Get started by adding your first supplier"
              action={
                <SupplierForm>
                  <Button className="mt-4">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Supplier
                  </Button>
                </SupplierForm>
              }
            />
          ) : (
            <Table containerClassName="flex-1 min-h-0 max-h-full">
              <TableHeader>
                <TableRow>
                  <TableHead resizable className="w-[200px] min-w-[150px]">Name</TableHead>
                  <TableHead resizable className="w-[150px] min-w-[100px]">Contact</TableHead>
                  <TableHead resizable className="w-[200px] min-w-[150px]">Address</TableHead>
                  <TableHead resizable className="w-[150px] min-w-[100px]">GSTIN</TableHead>
                  <TableHead className="w-[100px] min-w-[80px] text-right">Actions</TableHead>
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
