import { getSuppliers } from "./actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { PageHeader } from "@/components/ui/page-header"
import { DataEmptyState } from "@/components/ui/data-empty-state"
import { CardTitleWithCount } from "@/components/ui/card-title-with-count"
import { Plus, Truck } from "lucide-react"
import { SupplierForm } from "@/components/suppliers/supplier-form"
import { SuppliersTable } from "@/components/suppliers/suppliers-table"

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
            icon={<Truck className="w-4 h-4 sm:w-5 sm:h-5" />}
            title="All Suppliers"
            mobileTitle="Suppliers"
            count={suppliers.length}
          />
        </CardHeader>
        <CardContent className="flex-1 min-h-0 overflow-hidden px-4 pb-4 pt-0">
          {suppliers.length === 0 ? (
            <DataEmptyState
              icon={<Truck className="w-12 h-12" />}
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
            <SuppliersTable suppliers={suppliers} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
